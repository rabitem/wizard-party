import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

/** Upstash answers MGET with one value per key, null for a key never written. */
class FakeTotalsRedis {
  readonly values = new Map<string, unknown>();
  failWith: Error | null = null;

  async mget(...keys: (string | string[])[]): Promise<unknown[]> {
    if (this.failWith) throw this.failWith;
    return keys.flat().map((key) => this.values.get(key) ?? null);
  }
}

const redis = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/redis', () => ({ getRedis: () => redis.client }));

beforeEach(() => {
  redis.client = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/stats', () => {
  it('should answer the recorded totals from Redis, marked as real data', async () => {
    const fake = new FakeTotalsRedis();
    // Keys predate the store and keep their history (redis-global-stats-store.ts).
    fake.values.set('stats:games_played', 7);
    fake.values.set('stats:highest_score', 180);
    fake.values.set('stats:perfect_bids', '12');
    redis.client = fake;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      gamesPlayed: 7,
      roundsPlayed: 0,
      wizardsPlayed: 0,
      jestersPlayed: 0,
      cardsPlayed: 0,
      tricksPlayed: 0,
      perfectBids: 12,
      totalBids: 0,
      highestScore: 180,
      comebackWins: 0,
      isMock: false,
    });
  });

  it('should answer sample data marked isMock on a deployment without Redis', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const body = (await (await GET()).json()) as Record<string, unknown>;

    expect(body.isMock).toBe(true);
    expect(typeof body.gamesPlayed).toBe('number');
  });

  it('should fall back to sample data instead of failing the home page when Redis errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fake = new FakeTotalsRedis();
    fake.failWith = new Error('ECONNRESET');
    redis.client = fake;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(((await response.json()) as { isMock: boolean }).isMock).toBe(true);
    expect(log).toHaveBeenCalled();
  });
});
