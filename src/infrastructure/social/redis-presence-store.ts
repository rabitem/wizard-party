import 'server-only';

import type { Redis } from '@upstash/redis';

import { isPresenceMode, parsePresenceActivity, type PresenceHeartbeat } from '@shared/domain/social';
import type { IPresenceStore, IRoomRosterStore } from '@shared/application/ports/social';

import { getRedis } from '@/lib/redis';

const PRESENCE_KEY = 'presence:v1';
const ROSTER_KEY = 'room-roster:v2';
const ATTESTED_SEAT_KEY = 'seat-attested:v1';
const MS_PER_SECOND = 1000;

/**
 * Claims a seat (field) for an account as `<userId>|<expires at, epoch s>`. A live seat of another
 * account is never taken over; each seat expires on its own, so one active player can't keep stale
 * seats alive. The hash itself lives as long as its newest seat. Atomic.
 * ARGV: seat, userId, now (s), ttl (s).
 */
const CLAIM_SEAT = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
if current then
  local owner, expires = string.match(current, '^(.*)|(%d+)$')
  if owner and owner ~= ARGV[2] and tonumber(expires) > tonumber(ARGV[3]) then return 0 end
end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2] .. '|' .. (tonumber(ARGV[3]) + tonumber(ARGV[4])))
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1`;

const rosterKey = (roomCode: string) => `${ROSTER_KEY}:${roomCode.toLowerCase()}`;
const attestedKey = (roomCode: string, userId: string) => `${ATTESTED_SEAT_KEY}:${roomCode.toLowerCase()}:${userId}`;

/** Live owner of a stored seat value, or null when expired or malformed. */
function liveOwner(value: unknown, nowSeconds: number): string | null {
  if (typeof value !== 'string') return null;
  const separator = value.lastIndexOf('|');
  const expires = Number(value.slice(separator + 1));
  return separator > 0 && expires > nowSeconds ? value.slice(0, separator) : null;
}

/** Stored heartbeats are re-validated: Redis content is treated as untrusted input. */
function parseHeartbeat(raw: unknown): PresenceHeartbeat | null {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (typeof value !== 'object' || value === null) return null;
  const { mode, activity, idle, at } = value as Record<string, unknown>;
  if (!isPresenceMode(mode) || typeof at !== 'number') return null;
  return { mode, activity: parsePresenceActivity(activity), idle: idle === true, at };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Presence and room rosters in Upstash Redis: one key per heartbeat with a TTL, so offline is
 * simply "no key". A pulse costs one SET and one MGET. Fails soft: without Redis everyone looks
 * offline, nothing breaks.
 */
export class RedisPresenceStore implements IPresenceStore, IRoomRosterStore {
  constructor(
    private readonly getClient: () => Redis | null = getRedis,
    private readonly now: () => number = Date.now
  ) {}

  async publish(userId: string, heartbeat: PresenceHeartbeat, ttlSeconds: number): Promise<void> {
    await this.safely(undefined, (redis) => redis.set(`${PRESENCE_KEY}:${userId}`, JSON.stringify(heartbeat), { ex: ttlSeconds }));
  }

  async read(userIds: readonly string[]): Promise<Map<string, PresenceHeartbeat>> {
    const result = new Map<string, PresenceHeartbeat>();
    if (userIds.length === 0) return result;
    const values = await this.safely<unknown[]>([], (redis) => redis.mget<unknown[]>(...userIds.map((id) => `${PRESENCE_KEY}:${id}`)));
    userIds.forEach((id, index) => {
      const heartbeat = parseHeartbeat(values[index]);
      if (heartbeat) result.set(id, heartbeat);
    });
    return result;
  }

  async claim(roomCode: string, gamePlayerId: string, userId: string, ttlSeconds: number): Promise<void> {
    const nowSeconds = Math.floor(this.now() / MS_PER_SECOND);
    await this.safely(undefined, (redis) => redis.eval(CLAIM_SEAT, [rosterKey(roomCode)], [gamePlayerId, userId, nowSeconds, ttlSeconds]));
  }

  async lookup(roomCode: string): Promise<Map<string, string>> {
    const seats = await this.safely<Record<string, unknown> | null>(null, (redis) => redis.hgetall(rosterKey(roomCode)));
    const nowSeconds = Math.floor(this.now() / MS_PER_SECOND);
    return new Map(
      Object.entries(seats ?? {}).flatMap(([seat, value]) => {
        const owner = liveOwner(value, nowSeconds);
        return owner ? [[seat, owner] as const] : [];
      })
    );
  }

  async attestedSeat(roomCode: string, userId: string): Promise<string | null> {
    const seat = await this.safely<unknown>(null, (redis) => redis.get(attestedKey(roomCode, userId)));
    // Upstash deserializes JSON-looking values, so an all-digit seat id comes back as a number.
    if (typeof seat === 'number') return String(seat);
    return typeof seat === 'string' && seat.length > 0 ? seat : null;
  }

  async rememberAttestedSeat(roomCode: string, userId: string, gamePlayerId: string, ttlSeconds: number): Promise<void> {
    await this.safely(undefined, (redis) => redis.set(attestedKey(roomCode, userId), gamePlayerId, { ex: ttlSeconds }));
  }

  private async safely<T>(fallback: T, run: (redis: Redis) => Promise<unknown>): Promise<T> {
    const redis = this.getClient();
    if (!redis) return fallback;
    try {
      return ((await run(redis)) as T) ?? fallback;
    } catch (error) {
      console.warn('[presence] Redis unavailable', error instanceof Error ? error.message : error);
      return fallback;
    }
  }
}
