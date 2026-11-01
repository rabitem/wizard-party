import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/redis', () => ({ getRedis: () => null }));

import type { PresenceHeartbeat } from '@shared/domain/social';

import { RedisPresenceStore } from './redis-presence-store';

const NOW_MS = 1_700_000_000_000;
const NOW_S = NOW_MS / 1000;

/** Upstash's REST client parses JSON-looking values on read (automatic deserialization). */
function deserialize(value: string | undefined): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * The few Upstash commands the store reads and writes, over plain maps. The seat claim is a Lua
 * script and is not emulated: seats are seeded as the script stores them (`<userId>|<expires s>`).
 */
class FakeUpstash {
  strings = new Map<string, { value: string; ex?: number }>();
  hashes = new Map<string, Record<string, string>>();

  async set(key: string, value: string, options?: { ex?: number }) {
    this.strings.set(key, { value: String(value), ex: options?.ex });
    return 'OK';
  }
  async get(key: string) {
    return deserialize(this.strings.get(key)?.value);
  }
  async mget(...keys: string[]) {
    return keys.map((key) => deserialize(this.strings.get(key)?.value));
  }
  async hgetall(key: string) {
    const hash = this.hashes.get(key);
    return hash ? Object.fromEntries(Object.entries(hash).map(([field, value]) => [field, deserialize(value)])) : null;
  }
}

const heartbeat = (overrides: Partial<PresenceHeartbeat> = {}): PresenceHeartbeat => ({
  mode: 'online',
  activity: { kind: 'lobby', roomCode: 'ROOM42', gamePlayerId: null },
  idle: false,
  at: NOW_MS,
  ...overrides,
});

let redis: FakeUpstash;
let store: RedisPresenceStore;

beforeEach(() => {
  redis = new FakeUpstash();
  store = new RedisPresenceStore(() => redis as never, () => NOW_MS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RedisPresenceStore presence', () => {
  it('should publish a heartbeat that expires after its TTL and read it back', async () => {
    await store.publish('ada', heartbeat({ idle: true }), 90);

    expect(redis.strings.get('presence:v1:ada')?.ex).toBe(90);
    expect(await store.read(['ada'])).toEqual(new Map([['ada', heartbeat({ idle: true })]]));
  });

  it('should leave out players without a live heartbeat (offline is no key)', async () => {
    await store.publish('ada', heartbeat(), 90);

    const presence = await store.read(['ada', 'bob']);

    expect([...presence.keys()]).toEqual(['ada']);
  });

  it('should read nothing for an empty friend list', async () => {
    const mget = vi.spyOn(redis, 'mget');
    expect((await store.read([])).size).toBe(0);
    expect(mget).not.toHaveBeenCalled();
  });

  it.each([
    ['not JSON', '{broken'],
    ['an unknown mode', JSON.stringify({ mode: 'ghost', activity: { kind: 'menu' }, idle: false, at: NOW_MS })],
    ['no timestamp', JSON.stringify({ mode: 'online', activity: { kind: 'menu' }, idle: false })],
    ['a bare number', '42'],
  ])('should treat a stored heartbeat with %s as offline', async (_label, raw) => {
    redis.strings.set('presence:v1:ada', { value: raw });
    expect((await store.read(['ada'])).has('ada')).toBe(false);
  });

  it('should re-validate the stored activity and never pass on a seat from Redis', async () => {
    redis.strings.set('presence:v1:ada', {
      value: JSON.stringify({ mode: 'busy', activity: { kind: 'game', roomCode: 'ROOM42', gamePlayerId: 'seat-9' }, idle: 'yes', at: NOW_MS }),
    });
    redis.strings.set('presence:v1:bob', {
      value: JSON.stringify({ mode: 'away', activity: { kind: 'lobby', roomCode: '<script>' }, idle: true, at: NOW_MS }),
    });

    const presence = await store.read(['ada', 'bob']);

    expect(presence.get('ada')).toEqual({ mode: 'busy', activity: { kind: 'game', roomCode: 'ROOM42', gamePlayerId: null }, idle: false, at: NOW_MS });
    expect(presence.get('bob')?.activity).toEqual({ kind: 'menu' });
  });
});

describe('RedisPresenceStore room roster', () => {
  it('should list live seats only, under the lowercase room key', async () => {
    redis.hashes.set('room-roster:v2:room42', {
      'seat-1': `ada|${NOW_S + 30}`,
      'seat-2': `bob|${NOW_S}`,
      'seat-3': `carol|${NOW_S - 5}`,
      'seat-4': 'garbage',
      'seat-5': `|${NOW_S + 30}`,
    });

    expect(await store.lookup('ROOM42')).toEqual(new Map([['seat-1', 'ada']]));
  });

  it('should keep an account id that itself contains the separator', async () => {
    redis.hashes.set('room-roster:v2:room42', { 'seat-1': `user|with|pipes|${NOW_S + 30}` });
    expect(await store.lookup('room42')).toEqual(new Map([['seat-1', 'user|with|pipes']]));
  });

  it('should answer an empty roster for an unknown room', async () => {
    expect((await store.lookup('NOPE')).size).toBe(0);
  });
});

describe('RedisPresenceStore seat attestations', () => {
  it('should remember an attested seat for its TTL under the lowercase room key', async () => {
    await store.rememberAttestedSeat('ROOM42', 'ada', 'seat-7', 300);

    expect(redis.strings.get('seat-attested:v1:room42:ada')).toEqual({ value: 'seat-7', ex: 300 });
    expect(await store.attestedSeat('room42', 'ada')).toBe('seat-7');
  });

  it('should return an all-digit seat id as the string it was stored as', async () => {
    await store.rememberAttestedSeat('ROOM42', 'ada', '12345', 300);
    expect(await store.attestedSeat('ROOM42', 'ada')).toBe('12345');
  });

  it('should have no attestation for a player the worker never vouched for', async () => {
    expect(await store.attestedSeat('ROOM42', 'ada')).toBeNull();
  });
});

describe('RedisPresenceStore without Redis', () => {
  it('should make everyone look offline and drop writes when Redis is not configured', async () => {
    const offline = new RedisPresenceStore(() => null, () => NOW_MS);

    await expect(offline.publish('ada', heartbeat(), 90)).resolves.toBeUndefined();
    await expect(offline.claim('ROOM42', 'seat-1', 'ada', 60)).resolves.toBeUndefined();
    expect((await offline.read(['ada'])).size).toBe(0);
    expect((await offline.lookup('ROOM42')).size).toBe(0);
    expect(await offline.attestedSeat('ROOM42', 'ada')).toBeNull();
  });

  it('should fail soft when a Redis call throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = new RedisPresenceStore(
      () =>
        ({
          set: () => Promise.reject(new Error('ECONNRESET')),
          mget: () => Promise.reject(new Error('ECONNRESET')),
          hgetall: () => Promise.reject(new Error('ECONNRESET')),
          get: () => Promise.reject(new Error('ECONNRESET')),
        }) as never,
      () => NOW_MS
    );

    await expect(failing.publish('ada', heartbeat(), 90)).resolves.toBeUndefined();
    expect((await failing.read(['ada'])).size).toBe(0);
    expect((await failing.lookup('ROOM42')).size).toBe(0);
    expect(await failing.attestedSeat('ROOM42', 'ada')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
