import 'server-only';

import type { Redis } from '@upstash/redis';

import type { IUsageCounter } from '@shared/application';

import { getRedis } from '@/lib/redis';

/**
 * INCRBY and EXPIRE in one atomic script: a counter can never exist without a TTL, even when the
 * request dies between the two commands. The TTL is only set when the key has none, so the window
 * is fixed from the first increment.
 */
const INCREMENT_WITH_EXPIRY = `
local total = redis.call('INCRBY', KEYS[1], ARGV[1])
if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return total`;

/** Fixed-window counters in Upstash Redis. Fails open (returns null) without Redis or on errors. */
export class RedisUsageCounter implements IUsageCounter {
  constructor(private readonly getClient: () => Pick<Redis, 'eval'> | null = getRedis) {}

  async add(key: string, amount: number, windowSeconds: number): Promise<number | null> {
    const redis = this.getClient();
    if (!redis) return null;
    try {
      const total = Number(await redis.eval(INCREMENT_WITH_EXPIRY, [key], [amount, windowSeconds]));
      return Number.isFinite(total) ? total : null;
    } catch (error) {
      console.warn('[UsageCounter] Redis unavailable, failing open', error instanceof Error ? error.message : error);
      return null;
    }
  }
}
