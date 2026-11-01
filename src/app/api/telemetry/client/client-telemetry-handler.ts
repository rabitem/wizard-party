import type { IngestClientTelemetryInput, IngestClientTelemetryOutput } from '@shared/application';
import { CLIENT_TELEMETRY_LIMITS, type ClientTelemetryIngestContext } from '@shared/telemetry';
import { parseClientTelemetryBatch } from '@shared/telemetry/client-telemetry-schema';

import { clientNetworkKey } from '@/infrastructure/rate-limit/client-network';
import type { RateLimiter } from '@/infrastructure/rate-limit/fixed-window-rate-limiter';

import { readBoundedBody } from './read-bounded-body';

export const CLIENT_TELEMETRY_RATE_LIMIT = {
  REQUEST_PREFIX: 'ratelimit:client-telemetry:requests',
  EVENT_PREFIX: 'ratelimit:client-telemetry:events',
} as const;

const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const MAX_LOGGED_ERROR_CHARS = 500;

type LogLevel = 'info' | 'warn' | 'error';

export interface ClientTelemetryHandlerDeps {
  ingest: { execute(input: IngestClientTelemetryInput): Promise<IngestClientTelemetryOutput> };
  /** Requests per client network; checked before the body is read. */
  requestLimiter: RateLimiter;
  /** Valid events per client network; bounds stored volume, not just request count. */
  eventLimiter: RateLimiter;
  isStorageConfigured: () => boolean;
  log: (level: LogLevel, msg: string, fields: Record<string, unknown>) => void;
  now: () => number;
}

function status(code: number): Response {
  return new Response(null, { status: code });
}

/**
 * Rate-limit subject: the client network (IPv4 address or IPv6 /64). Only ever passed to the
 * limiters, which store a keyed hash of it for one window; never logged or stored.
 */
function clientNetwork(headers: Headers): string {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
  return clientNetworkKey(ip);
}

function ingestContext(headers: Headers, receivedAt: number): ClientTelemetryIngestContext {
  const country = headers.get('x-vercel-ip-country')?.toUpperCase() ?? null;
  return {
    receivedAt,
    country: country && COUNTRY_PATTERN.test(country) ? country : null,
    userAgent: headers.get('user-agent')?.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_USER_AGENT_CHARS) || null,
  };
}

function parseJson(body: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false };
  }
}

/**
 * Public ingest for browser telemetry. Accepts sendBeacon bodies (text/plain) as well as
 * application/json. Browsers never retry, so every response is final; 204 on success.
 */
export function createClientTelemetryHandler(deps: ClientTelemetryHandlerDeps) {
  return async function handle(req: Request): Promise<Response> {
    const startedAt = deps.now();
    const requestId = req.headers.get('x-vercel-id');
    if (req.headers.get('sec-fetch-site') === 'cross-site') return status(403);

    const network = clientNetwork(req.headers);
    // Headers only: a rate-limited client never makes us read its body.
    if (!(await deps.requestLimiter.allow(network))) return status(429);
    const body = await readBoundedBody(req, CLIENT_TELEMETRY_LIMITS.MAX_BODY_BYTES);
    if (body === null) return status(413);

    const json = parseJson(body);
    if (!json.ok) return status(400);
    const parsed = parseClientTelemetryBatch(json.value, startedAt);
    if (!parsed.ok) {
      deps.log('warn', 'client_telemetry_invalid', { requestId, error: parsed.error.slice(0, MAX_LOGGED_ERROR_CHARS) });
      return status(400);
    }
    if (parsed.events.length === 0) return status(204);
    if (!(await deps.eventLimiter.allow(network, parsed.events.length))) return status(429);
    if (!deps.isStorageConfigured()) {
      deps.log('warn', 'client_telemetry_storage_not_configured', { requestId, events: parsed.events.length });
      return status(503);
    }

    try {
      const result = await deps.ingest.execute({ events: parsed.events, context: ingestContext(req.headers, startedAt) });
      deps.log('info', 'client_telemetry_ingested', { requestId, ...result, rejected: parsed.rejected, ms: deps.now() - startedAt });
      return status(204);
    } catch (error) {
      deps.log('error', 'client_telemetry_ingest_failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        ms: deps.now() - startedAt,
      });
      return status(503);
    }
  };
}
