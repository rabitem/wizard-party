import { describe, expect, it } from 'vitest';

import { DEFAULT_APPEARANCE } from '../character';
import { EMPTY_STATS } from './player-stats';
import { LEADERBOARD_RULES, buildLeaderboards, rankLeaderboard, type LeaderboardCandidate } from './leaderboard';

function candidate(username: string, overrides: Partial<LeaderboardCandidate['stats']> = {}, totalXp = 500): LeaderboardCandidate {
  return {
    username,
    displayName: username.toUpperCase(),
    avatar: 'wizard',
    appearance: DEFAULT_APPEARANCE,
    totalXp,
    stats: { ...EMPTY_STATS, gamesPlayed: 12, gamesWon: 3, highestScore: 100, ...overrides },
  };
}

describe('rankLeaderboard', () => {
  it('should rank by XP and expose level and title', () => {
    const entries = rankLeaderboard('level', [candidate('a', {}, 100), candidate('b', {}, 900), candidate('c', {}, 0)]);
    expect(entries.map((e) => e.username)).toEqual(['b', 'a']);
    expect(entries[0]).toMatchObject({ rank: 1, value: 900, displayName: 'B' });
    expect(entries[0].level).toBeGreaterThan(entries[1].level);
  });

  it('should share ranks between equal values (competition ranking)', () => {
    const entries = rankLeaderboard('wins', [candidate('a', { gamesWon: 5 }), candidate('b', { gamesWon: 5 }), candidate('c', { gamesWon: 2 })]);
    expect(entries.map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it('should require a minimum number of games for win rate', () => {
    const entries = rankLeaderboard('win-rate', [
      candidate('lucky', { gamesPlayed: 1, gamesWon: 1 }),
      candidate('steady', { gamesPlayed: LEADERBOARD_RULES.MIN_GAMES_FOR_WIN_RATE, gamesWon: 6 }),
    ]);
    expect(entries.map((e) => e.username)).toEqual(['steady']);
    expect(entries[0].value).toBeCloseTo(0.6);
  });

  it('should cap the board size and break ties by XP', () => {
    const many = Array.from({ length: 15 }, (_, i) => candidate(`p${i}`, { highestScore: 50 }, i));
    const entries = rankLeaderboard('best-score', many);
    expect(entries).toHaveLength(LEADERBOARD_RULES.SIZE);
    expect(entries[0].username).toBe('p14');
  });
});

describe('buildLeaderboards', () => {
  it('should build every board and skip players without games', () => {
    const boards = buildLeaderboards([candidate('a'), candidate('fresh', { gamesPlayed: 0, gamesWon: 0 }, 0)]);
    expect(Object.keys(boards)).toEqual(['level', 'wins', 'win-rate', 'best-score']);
    expect(boards['best-score'].map((e) => e.username)).toEqual(['a']);
  });
});
