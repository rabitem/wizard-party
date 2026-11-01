import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A counter store with the two commands the limiter uses; one instance per test. */
const fake = vi.hoisted(() => ({
  counts: new Map<string, number>(),
  expiries: new Map<string, number>(),
  clients: 0,
}));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {
      fake.clients++;
    }
    async incr(key: string) {
      const next = (fake.counts.get(key) ?? 0) + 1;
      fake.counts.set(key, next);
      return next;
    }
    async expire(key: string, seconds: number) {
      fake.expiries.set(key, seconds);
      return 1;
    }
  },
}));

/** Username checks: 30 per minute per IP (docs/accounts/accounts.md: per-IP budget). */
const LIMIT = 30;
const WINDOW_SECONDS = 60;

async function loadModule() {
  vi.resetModules();
  return import('./redis');
}

beforeEach(() => {
  fake.counts.clear();
  fake.expiries.clear();
  fake.clients = 0;
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getRedis', () => {
  it('should have no client without a REST URL and token', async () => {
    const { getRedis } = await loadModule();
    vi.stubEnv('KV_REST_API_URL', 'https://redis.example.test');

    expect(getRedis()).toBeNull();
  });

  it.each([
    ['Vercel KV', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['Upstash', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ])('should connect with the %s variables and reuse one client', async (_label, urlVar, tokenVar) => {
    vi.stubEnv(urlVar, 'https://redis.example.test');
    vi.stubEnv(tokenVar, 'token');
    const { getRedis } = await loadModule();

    const first = getRedis();

    expect(first).not.toBeNull();
    expect(getRedis()).toBe(first);
    expect(fake.clients).toBe(1);
  });
});

describe('checkRateLimit', () => {
  it('should allow every check without Redis', async () => {
    const { checkRateLimit } = await loadModule();
    expect(await checkRateLimit('203.0.113.7')).toEqual({ allowed: true, remaining: LIMIT });
  });

  describe('with Redis', () => {
    beforeEach(() => {
      vi.stubEnv('KV_REST_API_URL', 'https://redis.example.test');
      vi.stubEnv('KV_REST_API_TOKEN', 'token');
    });

    it('should allow the budget, then refuse, counting down what is left', async () => {
      const { checkRateLimit } = await loadModule();
      const results = [];
      for (let attempt = 0; attempt < LIMIT + 1; attempt++) {
        // eslint-disable-next-line no-await-in-loop -- counts must accumulate in order
        results.push(await checkRateLimit('203.0.113.7'));
      }

      expect(results[0]).toEqual({ allowed: true, remaining: LIMIT - 1 });
      expect(results[LIMIT - 1]).toEqual({ allowed: true, remaining: 0 });
      expect(results[LIMIT]).toEqual({ allowed: false, remaining: 0 });
    });

    it('should start the one-minute window on the first check only', async () => {
      const { checkRateLimit } = await loadModule();
      await checkRateLimit('203.0.113.7');
      fake.expiries.clear();

      await checkRateLimit('203.0.113.7');

      expect(fake.expiries.size).toBe(0);
    });

    it('should open a window that expires after a minute', async () => {
      const { checkRateLimit } = await loadModule();

      await checkRateLimit('203.0.113.7');

      expect([...fake.expiries.values()]).toEqual([WINDOW_SECONDS]);
    });

    it('should keep a separate budget per IP', async () => {
      const { checkRateLimit } = await loadModule();
      for (let attempt = 0; attempt < LIMIT + 1; attempt++) {
        // eslint-disable-next-line no-await-in-loop -- counts must accumulate in order
        await checkRateLimit('203.0.113.7');
      }

      expect(await checkRateLimit('198.51.100.2')).toEqual({ allowed: true, remaining: LIMIT - 1 });
    });
  });
});
