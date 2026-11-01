import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_ORIGIN, harness, signInAs, setUpApiHarness } from '../../api-test-support';
import { GET } from './route';

/** The per-IP budget of username checks (src/lib/redis.ts): 30 per minute. */
const CHECKS_PER_MINUTE = 30;

const app = vi.hoisted(() => ({
  databaseConfigured: true,
  requestHeaders: new Headers(),
  /** What Upstash holds: key -> counter. */
  counters: new Map<string, number>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => app.requestHeaders }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    async incr(key: string): Promise<number> {
      const next = (app.counters.get(key) ?? 0) + 1;
      app.counters.set(key, next);
      return next;
    }
    async expire(): Promise<number> {
      return 1;
    }
  },
}));
vi.mock('@/infrastructure/auth/auth', async () => (await import('../../api-test-support')).authModule());
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => app.databaseConfigured }));
vi.mock('@/infrastructure/social/social-container', async () => (await import('../../api-test-support')).socialContainerModule());

setUpApiHarness();

interface CheckOptions {
  ip?: string;
  signedInAs?: string;
}

/** A browser's check; next/headers() serves the same request headers as the route sees. */
async function check(username: string | null, { ip = '203.0.113.7', signedInAs }: CheckOptions = {}): Promise<Response> {
  signInAs(signedInAs ?? null);
  const query = username === null ? '' : `?username=${encodeURIComponent(username)}`;
  const request = new Request(`${APP_ORIGIN}/api/username/check${query}`, { headers: { 'x-forwarded-for': ip } });
  app.requestHeaders = request.headers;
  return GET(request);
}

async function bodyOf(response: Response): Promise<{ available?: boolean; error?: string }> {
  return (await response.json()) as { available?: boolean; error?: string };
}

beforeEach(() => {
  harness().socialDb.addPlayer('merlin');
  app.databaseConfigured = true;
  app.counters.clear();
  vi.stubEnv('KV_REST_API_URL', 'https://redis.example.test');
  vi.stubEnv('KV_REST_API_TOKEN', 'test-token');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GET /api/username/check', () => {
  it('should answer 400 without a username parameter', async () => {
    const response = await check(null);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'Username is required' });
  });

  it.each([
    ['only whitespace', '   '],
    ['longer than 20 characters', 'a'.repeat(21)],
  ])('should answer 400 and not available for a name that is %s', async (_label, name) => {
    const response = await check(name);

    expect(response.status).toBe(400);
    expect((await bodyOf(response)).available).toBe(false);
  });

  it('should let a guest use a name no account holds, even one other guests use, and report the remaining budget', async () => {
    const response = await check('Gandalf the Grey');

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ available: true });
    expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(CHECKS_PER_MINUTE - 1));
  });

  it.each([
    ['a guest', undefined],
    ['another signed-in player', 'morgana'],
  ])("should refuse a registered account's name to %s, whatever its casing", async (_label, signedInAs) => {
    const response = await check('MERLIN', { signedInAs });

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ available: false, error: 'This name belongs to a registered player.' });
  });

  it('should let the account holder use their own name', async () => {
    const response = await check('Merlin', { signedInAs: 'merlin' });

    expect(await bodyOf(response)).toEqual({ available: true });
  });

  it('should not look up accounts on a deployment without a database', async () => {
    app.databaseConfigured = false;

    const response = await check('merlin');

    expect(await bodyOf(response)).toEqual({ available: true });
  });

  it('should answer 429 once an IP spent its budget, counting the first forwarded address, without affecting other IPs', async () => {
    for (let i = 0; i < CHECKS_PER_MINUTE; i++) {
      // eslint-disable-next-line no-await-in-loop -- the budget counts checks in order
      expect((await check('Gandalf', { ip: '198.51.100.1, 10.0.0.1' })).status).toBe(200);
    }

    const limited = await check('Gandalf', { ip: '198.51.100.1, 10.0.0.2' });
    const otherIp = await check('Gandalf', { ip: '198.51.100.2' });

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    expect(limited.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect((await bodyOf(limited)).available).toBe(false);
    expect(otherIp.status).toBe(200);
  });

  it('should fail open when the account lookup fails, so a storage outage never blocks guests', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(harness().socialDb, 'findByUsername').mockRejectedValue(new Error('db down'));

    const response = await check('merlin');

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ available: true, error: 'Check failed' });
  });
});
