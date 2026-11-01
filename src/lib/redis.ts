import { Redis } from '@upstash/redis';

// Singleton Redis client
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

const RATE_LIMIT_KEY = 'ratelimit:username'; // ratelimit:username:{ip} -> count
const RATE_LIMIT_WINDOW = 60; // 1 minute window
const RATE_LIMIT_MAX = 30; // Max 30 checks per minute per IP

/**
 * Rate limiting for username checks (by IP)
 */
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: RATE_LIMIT_MAX };

  const key = `${RATE_LIMIT_KEY}:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX - count);
  return { allowed: count <= RATE_LIMIT_MAX, remaining };
}
