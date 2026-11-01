import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAveragePlacement,
  getAverageScore,
  getBidAccuracy,
  getWinRate,
  loadPlayerStats,
  recordGameResult,
  resetPlayerStats,
  savePlayerStats,
  type PlayerStats,
  type RoundRecord,
} from './player-stats';

/** Guest stats already live in players' browsers under this key; renaming it loses them. */
const STATS_KEY = 'wizard-party-player-stats';
const PLAYED_AT = 1_700_000_000_000;

let stored: Map<string, string>;

const round = (roundNumber: number, bid: number, tricksWon: number, roundScore: number): RoundRecord => ({
  roundNumber,
  cardsInHand: roundNumber,
  bid,
  tricksWon,
  roundScore,
});

function storedStats(): PlayerStats {
  return JSON.parse(stored.get(STATS_KEY) ?? 'null') as PlayerStats;
}

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  });
  vi.useFakeTimers();
  vi.setSystemTime(PLAYED_AT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('guest player stats', () => {
  it('should start from empty stats for a new guest', () => {
    expect(loadPlayerStats()).toMatchObject({ gamesPlayed: 0, gamesWon: 0, gameHistory: [] });
  });

  it('should fill fields missing from stats saved by an older version with defaults', () => {
    stored.set(STATS_KEY, JSON.stringify({ gamesPlayed: 3, gamesWon: 1 }));

    const stats = loadPlayerStats();

    expect(stats.gamesPlayed).toBe(3);
    expect(stats.gamesWon).toBe(1);
    expect(stats.winStreak).toBe(0);
    expect(stats.gameHistory).toEqual([]);
  });

  it('should fall back to empty stats when the stored value is not an object', () => {
    stored.set(STATS_KEY, JSON.stringify(42));
    expect(loadPlayerStats().gamesPlayed).toBe(0);
  });

  it('should count a first-place game as a win, tally bids and tricks, and persist it', () => {
    const rounds = [round(1, 1, 1, 30), round(2, 0, 1, -10), round(3, 2, 2, 40)];

    const stats = recordGameResult(loadPlayerStats(), 1, 60, 4, rounds, 'game-a');

    expect(stats).toMatchObject({
      gamesPlayed: 1,
      gamesWon: 1,
      totalScore: 60,
      totalRounds: 3,
      totalBids: 3,
      correctBids: 2,
      totalTricksWon: 4,
      highestScore: 60,
      lowestScore: 60,
      currentStreak: 1,
      winStreak: 1,
    });
    expect(stats.gameHistory).toEqual([{ id: 'game-a', date: PLAYED_AT, playerCount: 4, placement: 1, score: 60, rounds }]);
    expect(loadPlayerStats()).toEqual(stats);
  });

  it('should take the first game score as the lowest score even when it is above zero', () => {
    const stats = recordGameResult(loadPlayerStats(), 2, 80, 3, [], 'game-a');
    expect(stats.lowestScore).toBe(80);

    const next = recordGameResult(stats, 3, -20, 3, [], 'game-b');
    expect(next.lowestScore).toBe(-20);
    expect(next.highestScore).toBe(80);
  });

  it('should keep the best win streak when a loss resets the current streak', () => {
    let stats = loadPlayerStats();
    for (const [index, placement] of [1, 1, 1, 2, 1].entries()) {
      stats = recordGameResult(stats, placement, 10, 3, [], `game-${index}`);
    }

    expect(stats.currentStreak).toBe(1);
    expect(stats.winStreak).toBe(3);
    expect(stats.gamesWon).toBe(4);
  });

  it('should keep only the last 50 games in the stored history', () => {
    const history = Array.from({ length: 55 }, (_, index) => ({
      id: `game-${index}`,
      date: PLAYED_AT + index,
      playerCount: 3,
      placement: 1,
      score: 0,
      rounds: [],
    }));

    savePlayerStats({ ...loadPlayerStats(), gamesPlayed: 55, gameHistory: history });

    const saved = storedStats();
    expect(saved.gamesPlayed).toBe(55);
    expect(saved.gameHistory.map((game) => game.id)).toEqual(history.slice(5).map((game) => game.id));
  });

  it('should wipe stored stats on reset', () => {
    recordGameResult(loadPlayerStats(), 1, 50, 3, [], 'game-a');

    expect(resetPlayerStats().gamesPlayed).toBe(0);
    expect(loadPlayerStats().gamesPlayed).toBe(0);
  });

  it('should neither read nor write storage outside a browser', () => {
    vi.stubGlobal('window', undefined);
    stored.set(STATS_KEY, JSON.stringify({ gamesPlayed: 9 }));

    expect(loadPlayerStats().gamesPlayed).toBe(0);
    recordGameResult(loadPlayerStats(), 1, 50, 3, [], 'game-a');
    expect(storedStats().gamesPlayed).toBe(9);
  });
});

describe('derived guest stats', () => {
  const stats = (overrides: Partial<PlayerStats>): PlayerStats => ({ ...loadPlayerStats(), ...overrides });

  it('should report zero for every ratio before the first game', () => {
    const empty = stats({});
    expect([getWinRate(empty), getBidAccuracy(empty), getAverageScore(empty), getAveragePlacement(empty)]).toEqual([0, 0, 0, 0]);
  });

  it('should report win rate and bid accuracy as percentages', () => {
    const played = stats({ gamesPlayed: 8, gamesWon: 2, totalBids: 40, correctBids: 30, totalScore: 400 });

    expect(getWinRate(played)).toBe(25);
    expect(getBidAccuracy(played)).toBe(75);
    expect(getAverageScore(played)).toBe(50);
  });

  it('should average placements over the kept history', () => {
    const game = (placement: number) => ({ id: `g-${placement}`, date: 0, playerCount: 4, placement, score: 0, rounds: [] });
    expect(getAveragePlacement(stats({ gameHistory: [game(1), game(2), game(4), game(1)] }))).toBe(2);
  });
});
