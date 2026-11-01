import { describe, expect, it } from 'vitest';

import {
  EMPTY_STATS,
  aggregateStats,
  deriveBaseline,
  findNewlyUnlocked,
  validateGameResult,
  xpForGame,
  type GameResult,
} from './index';

const NOW = 1_800_000_000_000;

let gameCounter = 0;

function game(overrides: Partial<GameResult> = {}): GameResult {
  gameCounter += 1;
  return {
    clientGameId: `game-${String(gameCounter).padStart(10, '0')}`,
    playedAt: NOW - 1000,
    playerCount: 4,
    placement: 2,
    score: 60,
    rounds: [
      { bid: 1, tricksWon: 1, roundScore: 30 },
      { bid: 0, tricksWon: 0, roundScore: 20 },
      { bid: 1, tricksWon: 2, roundScore: -10 },
    ],
    ...overrides,
  };
}

describe('validateGameResult', () => {
  it('should accept a well formed result', () => {
    const result = game();
    expect(validateGameResult(result, NOW)).toEqual(result);
  });

  it('should reject impossible placements, ids and future dates', () => {
    expect(validateGameResult(game({ placement: 5 }), NOW)).toBeNull();
    expect(validateGameResult(game({ clientGameId: 'x' }), NOW)).toBeNull();
    expect(validateGameResult(game({ playedAt: NOW + 60 * 60 * 1000 }), NOW)).toBeNull();
    expect(validateGameResult({ ...game(), rounds: [{ bid: -1, tricksWon: 0, roundScore: 0 }] }, NOW)).toBeNull();
  });

  it('should strip unknown fields', () => {
    const result = validateGameResult({ ...game(), extra: 'nope' }, NOW);
    expect(result).not.toHaveProperty('extra');
  });
});

describe('aggregateStats', () => {
  it('should count games, wins and streaks in chronological order', () => {
    const results = [
      game({ playedAt: 3, placement: 1, score: 100 }),
      game({ playedAt: 1, placement: 1, score: 40 }),
      game({ playedAt: 2, placement: 3, score: -20 }),
    ];
    const stats = aggregateStats(EMPTY_STATS, results);
    expect(stats.gamesPlayed).toBe(3);
    expect(stats.gamesWon).toBe(2);
    expect(stats.bestWinStreak).toBe(1);
    expect(stats.currentWinStreak).toBe(1);
    expect(stats.highestScore).toBe(100);
    expect(stats.lowestScore).toBe(-20);
    expect(stats.correctBids).toBe(6);
    expect(stats.totalBids).toBe(9);
  });
});

describe('deriveBaseline', () => {
  it('should keep only what the known games do not explain', () => {
    const known = [game({ placement: 1 }), game({ placement: 3 })];
    const aggregate = { ...aggregateStats(EMPTY_STATS, known), gamesPlayed: 10, gamesWon: 4, totalScore: 900 };
    const baseline = deriveBaseline(aggregate, known);
    expect(baseline.gamesPlayed).toBe(8);
    expect(baseline.gamesWon).toBe(3);
    expect(aggregateStats(baseline, known).gamesPlayed).toBe(10);
  });

  it('should return an empty baseline when history explains everything', () => {
    const known = [game()];
    expect(deriveBaseline(aggregateStats(EMPTY_STATS, known), known)).toEqual(EMPTY_STATS);
  });
});

describe('progression', () => {
  it('should reward wins more than losses and bigger tables more', () => {
    expect(xpForGame(game({ placement: 1 }))).toBeGreaterThan(xpForGame(game({ placement: 3 })));
    expect(xpForGame(game({ playerCount: 6 }))).toBeGreaterThan(xpForGame(game({ playerCount: 3 })));
  });
});

describe('achievements', () => {
  it('should unlock first game and win but skip ones already unlocked', () => {
    const results = [game({ placement: 1 })];
    const context = { stats: aggregateStats(EMPTY_STATS, results), results };
    const ids = findNewlyUnlocked(context, new Set(['first-game'])).map((a) => a.id);
    expect(ids).toContain('first-win');
    expect(ids).not.toContain('first-game');
    expect(ids).not.toContain('games-10');
  });

  it('should detect a flawless game', () => {
    const rounds = Array.from({ length: 5 }, () => ({ bid: 1, tricksWon: 1, roundScore: 30 }));
    const results = [game({ rounds, score: 150 })];
    const context = { stats: aggregateStats(EMPTY_STATS, results), results };
    expect(findNewlyUnlocked(context, new Set()).map((a) => a.id)).toContain('perfect-game');
  });
});
