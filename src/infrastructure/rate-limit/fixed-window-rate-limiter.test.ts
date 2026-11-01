import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/redis', () => ({ getRedis: () => null }));

import type { IUsageCounter } from '@shared/application';

import { FixedWindowRateLimiter } from './fixed-window-rate-limiter';
import { RedisUsageCounter } from './redis-usage-counter';

class InMemoryCounter implements IUsageCounter {
  readonly totals = new Map<string, number>();
  readonly ttls = new Map<string, number>();

  async add(key: string, amount: number, windowSeconds: number) {
    const total = (this.totals.get(key) ?? 0) + amount;
    this.totals.set(key, total);
    if (!this.ttls.has(key)) this.ttls.set(key, windowSeconds);
    return total;
  }
}

const WINDOW_SECONDS = 60;

function limiter(counter: IUsageCounter, now = () => 0) {
  return new FixedWindowRateLimiter({ prefix: 'ratelimit:test', limit: 3, windowSeconds: WINDOW_SECONDS, counter, keySecret: 'secret', now });
}

describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit per window, counting cost', async () => {
    const counter = new InMemoryCounter();
    const limit = limiter(counter);
    expect(await limit.allow('203.0.113.7', 2)).toBe(true);
    expect(await limit.allow('203.0.113.7')).toBe(true);
    expect(await limit.allow('203.0.113.7')).toBe(false);
    expect(await limit.allow('198.51.100.1')).toBe(true);
  });

  it('starts a fresh window and never stores the raw key', async () => {
    const counter = new InMemoryCounter();
    let now = 0;
    const limit = limiter(counter, () => now);
    await limit.allow('203.0.113.7', 4);
    expect(await limit.allow('203.0.113.7')).toBe(false);
    now = WINDOW_SECONDS * 1000;
    expect(await limit.allow('203.0.113.7')).toBe(true);
    const keys = [...counter.totals.keys()];
    expect(keys.some((key) => key.includes('203.0.113.7'))).toBe(false);
    // The keyed hash also differs per window, so keys are not linkable across windows.
    expect(new Set(keys.map((key) => key.split(':').at(-1))).size).toBe(2);
    expect([...counter.ttls.values()].every((ttl) => ttl === WINDOW_SECONDS)).toBe(true);
  });

  it('fails open when the counter is unavailable', async () => {
    const limit = limiter({ add: async () => null });
    expect(await limit.allow('203.0.113.7', 1_000)).toBe(true);
  });
});

describe('RedisUsageCounter', () => {
  it('increments and sets the expiry in one atomic script', async () => {
    const evalScript = vi.fn(async () => 4);
    const counter = new RedisUsageCounter(() => ({ eval: evalScript }) as never);
    expect(await counter.add('k', 2, 60)).toBe(4);
    expect(evalScript).toHaveBeenCalledTimes(1);
    const [script, keys, args] = evalScript.mock.calls[0] as unknown as [string, string[], unknown[]];
    expect(script).toContain('INCRBY');
    expect(script).toContain('EXPIRE');
    expect(keys).toEqual(['k']);
    expect(args).toEqual([2, 60]);
  });

  it('returns null without Redis or when Redis fails', async () => {
    expect(await new RedisUsageCounter(() => null).add('k', 1, 60)).toBeNull();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = new RedisUsageCounter(() => ({ eval: async () => { throw new Error('down'); } }) as never);
    expect(await failing.add('k', 1, 60)).toBeNull();
    warn.mockRestore();
  });
});
