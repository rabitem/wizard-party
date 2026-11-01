import { timingSafeEqual } from 'node:crypto';

import { PruneClientTelemetryUseCase } from '@shared/application';

import { PostgresClientTelemetryStore } from '@/infrastructure/telemetry/postgres-client-telemetry-store';
import { getSocialServices } from '@/infrastructure/social/social-container';
import { applyTelemetryRetention } from '@/infrastructure/telemetry/telemetry-retention';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ROUTE = '/api/cron/telemetry-retention';
const pruneClientTelemetry = new PruneClientTelemetryUseCase(new PostgresClientTelemetryStore());

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function log(level: 'info' | 'error', msg: string, fields: Record<string, unknown>): void {
  const line = `${JSON.stringify({ level, msg, route: ROUTE, ...fields })}\n`;
  (level === 'info' ? process.stdout : process.stderr).write(line);
}

/**
 * Daily Vercel Cron (vercel.json): the single entry point enforcing every storage period of the
 * privacy policy, for server game records, browser telemetry and inbox notifications alike.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req.headers.get('authorization'))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const steps = {
    server: () => applyTelemetryRetention(),
    client: () => pruneClientTelemetry.execute(startedAt),
    social: () => getSocialServices().pruneSocialData.execute(startedAt),
  };
  // Independent storage periods: one failing step must not skip the others.
  const settled = await Promise.allSettled(Object.values(steps).map((run) => run()));
  const results = Object.fromEntries(Object.keys(steps).map((name, index) => {
    const outcome = settled[index];
    return [name, outcome.status === 'fulfilled' ? outcome.value : { error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason) }];
  }));
  const failed = settled.some((outcome) => outcome.status === 'rejected');
  log(failed ? 'error' : 'info', failed ? 'telemetry_retention_failed' : 'telemetry_retention_applied', { ...results, ms: Date.now() - startedAt });
  return Response.json(results, { status: failed ? 500 : 200 });
}
