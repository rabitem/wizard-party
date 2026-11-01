import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/redis', () => ({ getRedis: () => null }));

import type { GameStatsContribution } from '@shared/domain/stats';

import { RedisGlobalStatsStore } from './redis-global-stats-store';

const CONTRIBUTION: GameStatsContribution = {
  roundsPlayed: 10,
  wizardsPlayed: 4,
  jestersPlayed: 3,
  cardsPlayed: 120,
  tricksPlayed: 40,
  perfectBids: 22,
  totalBids: 40,
  highestScore: 230,
  hadComeback: true,
};

describe('RedisGlobalStatsStore', () => {
  it('should record a game with one script guarded by a per-game marker', async () => {
    const evalScript = vi.fn(async () => 1);
    const store = new RedisGlobalStatsStore(() => ({ eval: evalScript }) as never);

    expect(await store.record('game-1', CONTRIBUTION)).toBe(true);

    const [script, keys, args] = evalScript.mock.calls[0] as unknown as [string, string[], number[]];
    expect(script).toContain("'NX'");
    expect(keys.slice(0, 3)).toEqual(['stats:recorded_game:game-1', 'stats:highest_score', 'stats:games_played']);
    expect(args.slice(1)).toEqual([230, 1, 10, 4, 3, 120, 40, 22, 40, 1]);
    expect(keys).toHaveLength(args.length);
  });

  it('should report a game that was already recorded', async () => {
    const store = new RedisGlobalStatsStore(() => ({ eval: async () => 0 }) as never);
    expect(await store.record('game-1', CONTRIBUTION)).toBe(false);
  });

  it('should read every total in one round trip', async () => {
    const mget = vi.fn(async () => [7, null, 3, 2, 90, 30, 12, 20, 180, 1]);
    const store = new RedisGlobalStatsStore(() => ({ mget }) as never);

    expect(await store.read()).toMatchObject({ gamesPlayed: 7, roundsPlayed: null, highestScore: 180, comebackWins: 1 });
    expect(mget).toHaveBeenCalledTimes(1);
  });

  it('should do nothing without Redis', async () => {
    const store = new RedisGlobalStatsStore(() => null);
    expect(await store.read()).toBeNull();
    expect(await store.record('game-1', CONTRIBUTION)).toBe(false);
  });
});
