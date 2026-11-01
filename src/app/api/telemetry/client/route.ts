import { IngestClientTelemetryUseCase } from '@shared/application';
import { CLIENT_TELEMETRY_BUDGETS } from '@shared/telemetry';

import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { FixedWindowRateLimiter } from '@/infrastructure/rate-limit/fixed-window-rate-limiter';
import { rateLimitKeySecret } from '@/infrastructure/rate-limit/rate-limit-key-secret';
import { RedisUsageCounter } from '@/infrastructure/rate-limit/redis-usage-counter';
import { PostgresClientTelemetryStore } from '@/infrastructure/telemetry/postgres-client-telemetry-store';

import { CLIENT_TELEMETRY_RATE_LIMIT, createClientTelemetryHandler } from './client-telemetry-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Next to the Neon database (us-east-1) so the ingest transaction stays a single short round trip.

const ROUTE = '/api/telemetry/client';

const counter = new RedisUsageCounter();
const keySecret = rateLimitKeySecret();

export const POST = createClientTelemetryHandler({
  ingest: new IngestClientTelemetryUseCase(new PostgresClientTelemetryStore(), { counter }),
  requestLimiter: new FixedWindowRateLimiter({
    prefix: CLIENT_TELEMETRY_RATE_LIMIT.REQUEST_PREFIX,
    limit: CLIENT_TELEMETRY_BUDGETS.MAX_REQUESTS_PER_CLIENT,
    windowSeconds: CLIENT_TELEMETRY_BUDGETS.REQUEST_WINDOW_SECONDS,
    counter,
    keySecret,
  }),
  eventLimiter: new FixedWindowRateLimiter({
    prefix: CLIENT_TELEMETRY_RATE_LIMIT.EVENT_PREFIX,
    limit: CLIENT_TELEMETRY_BUDGETS.MAX_EVENTS_PER_CLIENT,
    windowSeconds: CLIENT_TELEMETRY_BUDGETS.EVENT_WINDOW_SECONDS,
    counter,
    keySecret,
  }),
  isStorageConfigured: isDatabaseConfigured,
  log: (level, msg, fields) => {
    const line = `${JSON.stringify({ level, msg, route: ROUTE, ...fields })}\n`;
    (level === 'info' ? process.stdout : process.stderr).write(line);
  },
  now: Date.now,
});
