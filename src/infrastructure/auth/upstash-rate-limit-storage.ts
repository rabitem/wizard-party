import type { Redis } from '@upstash/redis';

// INCR + PEXPIRE in one round trip; atomic so concurrent requests cannot slip through.
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then return redis.call('TTL', KEYS[1]) end
return -1`;

/**
 * Distributed rate limiting for auth endpoints. Serverless instances do not share memory, so
 * the default in-memory limiter would let attackers spread attempts across instances.
 */
export function createUpstashRateLimitStorage(redis: Redis) {
  return {
    async consume(key: string, rule: { window: number; max: number }) {
      const retryAfter = await redis.eval<[string, string], number>(CONSUME_SCRIPT, [`ratelimit:auth:${key}`], [
        String(rule.window),
        String(rule.max),
      ]);
      return retryAfter < 0 ? { allowed: true, retryAfter: null } : { allowed: false, retryAfter: Math.max(1, retryAfter) };
    },
  };
}
