import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The three storage periods the cron enforces, as in-memory steps. */
const steps = vi.hoisted(() => ({
  server: vi.fn(async (): Promise<unknown> => [{ table: 'game_events', deleted: 0 }]),
  deleteClientTelemetry: vi.fn(async (_cutoff: number, _limit: number) => ({ events: 0, sessions: 0 })),
  social: vi.fn(async (_now: number): Promise<unknown> => ({ notifications: 0 })),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/telemetry/telemetry-retention', () => ({ applyTelemetryRetention: steps.server }));
vi.mock('@/infrastructure/telemetry/postgres-client-telemetry-store', () => ({
  PostgresClientTelemetryStore: class {
    deleteOlderThan = steps.deleteClientTelemetry;
  },
}));
vi.mock('@/infrastructure/social/social-container', () => ({
  getSocialServices: () => ({ pruneSocialData: { execute: steps.social } }),
}));

import { GET } from './route';

const SECRET = 'cron-secret-for-tests';
const NOW = Date.UTC(2026, 9, 31, 3, 0, 0);
const ENDPOINT = 'https://wizardparty.fun/api/cron/telemetry-retention';

function cron(authorization?: string): Request {
  return new Request(ENDPOINT, { headers: authorization === undefined ? {} : { authorization } });
}

function stepCalls(): number {
  return steps.server.mock.calls.length + steps.deleteClientTelemetry.mock.calls.length + steps.social.mock.calls.length;
}

describe('GET /api/cron/telemetry-retention', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    steps.server.mockClear();
    steps.deleteClientTelemetry.mockClear();
    steps.social.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ['no authorization header', undefined],
    ['another secret', 'Bearer not-the-cron-secret'],
    ['the secret without the Bearer scheme', SECRET],
    ['the secret with a suffix', `Bearer ${SECRET}x`],
  ])('should refuse %s with 401 and delete nothing', async (_label, authorization) => {
    const response = await GET(cron(authorization));
    expect(response.status).toBe(401);
    expect(stepCalls()).toBe(0);
  });

  it('should refuse every request while CRON_SECRET is unset', async () => {
    vi.stubEnv('CRON_SECRET', undefined);
    const response = await GET(cron('Bearer undefined'));
    expect(response.status).toBe(401);
    expect(stepCalls()).toBe(0);
  });

  it('should apply every storage period and answer each result', async () => {
    const response = await GET(cron(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.server).toEqual([{ table: 'game_events', deleted: 0 }]);
    expect(body.client).toMatchObject({ deletedEvents: 0, deletedSessions: 0, incomplete: false });
    expect(body.social).toEqual({ notifications: 0 });
    expect(steps.social).toHaveBeenCalledWith(NOW);
  });

  it('should still apply the other periods when one fails, and answer 500 naming the failure', async () => {
    steps.server.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await GET(cron(`Bearer ${SECRET}`));
    expect(response.status).toBe(500);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.server).toEqual({ error: 'database unavailable' });
    expect(body.social).toEqual({ notifications: 0 });
    expect(steps.deleteClientTelemetry).toHaveBeenCalled();
  });
});
