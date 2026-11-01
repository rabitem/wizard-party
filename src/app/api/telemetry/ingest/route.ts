import { IngestTelemetryBatchUseCase } from '@shared/application';
import { RecordCompletedGamesUseCase } from '@shared/application/use-cases/stats';
import {
  TELEMETRY_HEADERS,
  TELEMETRY_LIMITS,
  TelemetryEventType,
  verifyTelemetrySignature,
  type AnyTelemetryEnvelope,
} from '@shared/telemetry';
import { parseTelemetryBatch } from '@shared/telemetry/telemetry-schema';

import { readBoundedBody } from '@/app/api/telemetry/client/read-bounded-body';
import { PostgresCompletedGameReader } from '@/infrastructure/stats/postgres-completed-game-reader';
import { RedisGlobalStatsStore } from '@/infrastructure/stats/redis-global-stats-store';
import { PostgresTelemetryStore } from '@/infrastructure/telemetry/postgres-telemetry-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/telemetry/ingest';
const ingest = new IngestTelemetryBatchUseCase(new PostgresTelemetryStore());
const recordCompletedGames = new RecordCompletedGamesUseCase(new PostgresCompletedGameReader(), new RedisGlobalStatsStore());

function log(level: 'info' | 'warn' | 'error', msg: string, fields: Record<string, unknown>): void {
  const line = `${JSON.stringify({ level, msg, route: ROUTE, ...fields })}\n`;
  (level === 'info' ? process.stdout : process.stderr).write(line);
}

/**
 * The global totals follow from the stored batch. A failure is not retried, so a Redis outage
 * cannot hold up the producer's in-order outbox; the log names the games instead, and replaying
 * them is safe because the store counts each game id once.
 */
async function recordGlobalStats(events: readonly AnyTelemetryEnvelope[], requestId: string | null): Promise<void> {
  try {
    const { recorded } = await recordCompletedGames.execute(events);
    if (recorded > 0) log('info', 'global_stats_recorded', { requestId, games: recorded });
  } catch (error) {
    const gameIds = events.flatMap((event) => (event.type === TelemetryEventType.GAME_COMPLETED && event.gameId ? [event.gameId] : []));
    log('warn', 'global_stats_record_failed', { requestId, gameIds, error: error instanceof Error ? error.message : String(error) });
  }
}

function problem(status: number, detail: string): Response {
  return Response.json({ error: detail }, { status });
}

/**
 * Receives signed event batches from the realtime game server.
 *
 * Status codes are part of the producer contract: 2xx = stored, 400/413/422 = never retry
 * (the producer dead-letters), anything else = retry with backoff.
 */
export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();
  const requestId = req.headers.get('x-vercel-id');
  const secret = process.env.TELEMETRY_INGEST_SECRET;
  if (!secret) {
    log('error', 'telemetry_ingest_misconfigured', { requestId });
    return problem(503, 'ingest not configured');
  }

  // Read before the signature is checked: never buffer more than the limit for anyone.
  const body = await readBoundedBody(req, TELEMETRY_LIMITS.MAX_BODY_BYTES);
  if (body === null) return problem(413, 'body too large');

  const authentic = await verifyTelemetrySignature({
    secret,
    signature: req.headers.get(TELEMETRY_HEADERS.SIGNATURE),
    timestamp: req.headers.get(TELEMETRY_HEADERS.TIMESTAMP),
    body,
    now: Date.now(),
    toleranceMs: TELEMETRY_LIMITS.SIGNATURE_TOLERANCE_MS,
  });
  if (!authentic) {
    log('warn', 'telemetry_ingest_unauthorized', { requestId });
    return problem(401, 'invalid signature');
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return problem(400, 'invalid json');
  }
  const parsed = parseTelemetryBatch(json);
  if (!parsed.ok) {
    log('warn', 'telemetry_ingest_invalid', { requestId, error: parsed.error.slice(0, 2_000) });
    return problem(422, parsed.error);
  }

  try {
    const result = await ingest.execute(parsed.batch);
    await recordGlobalStats(parsed.batch.events, requestId);
    log('info', 'telemetry_ingested', {
      requestId,
      producer: parsed.batch.producer,
      ...result,
      lagMs: startedAt - parsed.batch.events[0].occurredAt,
      ms: Date.now() - startedAt,
    });
    return Response.json(result, { status: 202 });
  } catch (error) {
    log('error', 'telemetry_ingest_failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - startedAt,
    });
    return problem(503, 'storage unavailable');
  }
}
