import { describe, expect, it } from 'vitest';

import { EMPTY_GLOBAL_STATS, sanitizeGlobalStats, summarizeCompletedGame, type CompletedGameFacts } from './global-stats';

const result = (playerId: string, bid: number | null, tricksWon: number, totalScore: number) => ({ playerId, bid, tricksWon, totalScore });

function game(overrides: Partial<CompletedGameFacts> = {}): CompletedGameFacts {
  return {
    maxRounds: 4,
    winnerId: 'a',
    finalScores: [{ playerId: 'a', score: 90 }, { playerId: 'b', score: 40 }, { playerId: 'c', score: -10 }],
    rounds: [
      [result('a', 1, 1, 30), result('b', 0, 0, 20), result('c', 1, 0, -10)],
      [result('a', 0, 1, 20), result('b', 1, 1, 50), result('c', null, 0, -10)],
      [result('a', 1, 1, 50), result('b', 0, 1, 40), result('c', 0, 0, 10)],
      [result('a', 2, 2, 90), result('b', 1, 0, 40), result('c', 1, 1, -10)],
    ],
    cards: { total: 30, wizards: 3, jesters: 2 },
    ...overrides,
  };
}

describe('summarizeCompletedGame', () => {
  it('should add up rounds, cards, tricks won and bids of every player', () => {
    expect(summarizeCompletedGame(game())).toEqual({
      roundsPlayed: 4,
      wizardsPlayed: 3,
      jestersPlayed: 2,
      cardsPlayed: 30,
      tricksPlayed: 8,
      perfectBids: 7,
      totalBids: 11,
      highestScore: 90,
      hadComeback: false,
    });
  });

  it('should count a comeback when the winner was last after half of the rounds', () => {
    expect(summarizeCompletedGame(game({ winnerId: 'c' })).hadComeback).toBe(true);
  });

  it('should not count a comeback when the game ended before its halfway round', () => {
    expect(summarizeCompletedGame(game({ winnerId: 'c', maxRounds: 10 })).hadComeback).toBe(false);
  });

  it('should never report a negative highest score', () => {
    expect(summarizeCompletedGame(game({ finalScores: [{ playerId: 'a', score: -30 }] })).highestScore).toBe(0);
  });
});

describe('sanitizeGlobalStats', () => {
  it('should coerce storage values to non-negative integers and default missing ones to zero', () => {
    expect(sanitizeGlobalStats({ gamesPlayed: '12', roundsPlayed: 3.9, highestScore: -5, cardsPlayed: null })).toEqual({
      ...EMPTY_GLOBAL_STATS,
      gamesPlayed: 12,
      roundsPlayed: 3,
    });
  });
});
