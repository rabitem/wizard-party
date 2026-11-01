import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isValidClientGameId, validateGameResult } from '@shared/domain/account';

import type { GameRecord, PlayerStats } from '@/lib/player-stats';

import type { AccountOverviewDto } from './account-api';
import { loadGuestImportPayload, overviewToPlayerStats } from './guest-progress';

const STATS_KEY = 'wizard-party-player-stats';
const PLAYED_AT = 1_700_000_000_000;

const record = (overrides: Partial<GameRecord> = {}): GameRecord => ({
  id: `game-${PLAYED_AT}`,
  date: PLAYED_AT,
  playerCount: 4,
  placement: 2,
  score: 40,
  rounds: [
    { roundNumber: 1, cardsInHand: 1, bid: 1, tricksWon: 1, roundScore: 30 },
    { roundNumber: 2, cardsInHand: 2, bid: 0, tricksWon: 1, roundScore: -10 },
  ],
  ...overrides,
});

const guestStats = (overrides: Partial<PlayerStats> = {}): PlayerStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  totalRounds: 0,
  correctBids: 0,
  totalBids: 0,
  totalTricksWon: 0,
  highestScore: 0,
  lowestScore: 0,
  winStreak: 0,
  currentStreak: 0,
  gameHistory: [],
  ...overrides,
});

describe('loadGuestImportPayload', () => {
  let stored: Map<string, string>;

  /** What the import sends for a guest whose browser holds `stats`. */
  function importOf(stats: PlayerStats) {
    stored.set(STATS_KEY, JSON.stringify(stats));
    return loadGuestImportPayload();
  }

  beforeEach(() => {
    stored = new Map();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should offer nothing to import for a guest who never finished a game', () => {
    expect(loadGuestImportPayload()).toBeNull();
  });

  it('should turn a legacy guest record into a result the server accepts', () => {
    const result = importOf(guestStats({ gamesPlayed: 1, gameHistory: [record()] }))?.history[0];

    expect(result).toEqual({
      clientGameId: `game-${PLAYED_AT}`,
      playedAt: PLAYED_AT,
      playerCount: 4,
      placement: 2,
      score: 40,
      rounds: [
        { bid: 1, tricksWon: 1, roundScore: 30 },
        { bid: 0, tricksWon: 1, roundScore: -10 },
      ],
    });
    expect(validateGameResult(result, PLAYED_AT)).toEqual(result);
  });

  it.each([
    ['a short id', 'g1'],
    ['an id with characters outside the URL-safe set', 'game 1.5/x'],
    ['an id made only of foreign characters', '€€€'],
    ['an id longer than the 64-character limit', 'x'.repeat(80)],
  ])('should derive a valid idempotency key from %s', (_label, id) => {
    const clientGameId = importOf(guestStats({ gamesPlayed: 1, gameHistory: [record({ id })] }))?.history[0].clientGameId;

    expect(isValidClientGameId(clientGameId)).toBe(true);
  });

  it('should give two short legacy ids of different games different keys, the same again on a retried import', () => {
    const stats = guestStats({ gamesPlayed: 2, gameHistory: [record({ id: 'g1', date: PLAYED_AT }), record({ id: 'g1', date: PLAYED_AT + 1 })] });

    const keys = importOf(stats)?.history.map((result) => result.clientGameId) ?? [];
    const retried = importOf(stats)?.history.map((result) => result.clientGameId);

    expect(new Set(keys).size).toBe(2);
    expect(retried).toEqual(keys);
  });

  it('should carry the counters and rename the streak fields', () => {
    const payload = importOf(
      guestStats({ gamesPlayed: 2, gamesWon: 1, totalScore: 90, lowestScore: 20, highestScore: 70, winStreak: 1, currentStreak: 0, gameHistory: [record({ placement: 1 }), record({ placement: 3 })] })
    );

    expect(payload?.stats).toMatchObject({ gamesPlayed: 2, gamesWon: 1, totalScore: 90, lowestScore: 20, highestScore: 70, bestWinStreak: 1, currentWinStreak: 0 });
  });

  it('should approximate the placement total from the average of the kept history', () => {
    // 10 games played, the kept history averages 2.5 -> 25.
    const history = [record({ placement: 2 }), record({ placement: 3 })];
    expect(importOf(guestStats({ gamesPlayed: 10, gameHistory: history }))?.stats.totalPlacement).toBe(25);
  });

  it('should never report a placement total below one per game played (every placement is at least 1)', () => {
    expect(importOf(guestStats({ gamesPlayed: 7, gameHistory: [] }))?.stats.totalPlacement).toBe(7);
  });

  it('should send the summary and at most the last 50 kept games', () => {
    const history = Array.from({ length: 60 }, (_, index) => record({ id: `game-${PLAYED_AT + index}`, date: PLAYED_AT + index }));

    const payload = importOf(guestStats({ gamesPlayed: 60, gamesWon: 12, gameHistory: history }));

    expect(payload?.stats.gamesPlayed).toBe(60);
    expect(payload?.history).toHaveLength(50);
    expect(payload?.history[0].clientGameId).toBe(`game-${PLAYED_AT + 10}`);
    expect(payload?.history[49].clientGameId).toBe(`game-${PLAYED_AT + 59}`);
  });
});

describe('overviewToPlayerStats', () => {
  const overview = (overrides: Partial<AccountOverviewDto['stats']>, recentGames: unknown[] = []) =>
    ({
      stats: {
        gamesPlayed: 2,
        gamesWon: 1,
        totalScore: 70,
        totalRounds: 4,
        correctBids: 3,
        totalBids: 4,
        totalTricksWon: 5,
        highestScore: 50,
        lowestScore: 20,
        bestWinStreak: 1,
        currentWinStreak: 1,
        totalPlacement: 3,
        ...overrides,
      },
      recentGames,
    }) as unknown as AccountOverviewDto;

  it('should show account stats in the guest stats shape', () => {
    expect(overviewToPlayerStats(overview({}))).toMatchObject({ gamesPlayed: 2, lowestScore: 20, winStreak: 1, currentStreak: 1 });
  });

  it('should show a lowest score of 0 while the account has none yet', () => {
    expect(overviewToPlayerStats(overview({ gamesPlayed: 0, lowestScore: null })).lowestScore).toBe(0);
  });

  it('should list recent games oldest first, like the guest history, and number their rounds', () => {
    const newest = { clientGameId: 'game-new-0001', playedAt: 2, playerCount: 3, placement: 1, score: 50, rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }, { bid: 0, tricksWon: 0, roundScore: 20 }] };
    const oldest = { clientGameId: 'game-old-0001', playedAt: 1, playerCount: 3, placement: 2, score: 20, rounds: [] };

    const history = overviewToPlayerStats(overview({}, [newest, oldest])).gameHistory;

    expect(history.map((game) => game.id)).toEqual(['game-old-0001', 'game-new-0001']);
    expect(history[1]).toEqual({
      id: 'game-new-0001',
      date: 2,
      playerCount: 3,
      placement: 1,
      score: 50,
      rounds: [
        { roundNumber: 1, cardsInHand: 1, bid: 1, tricksWon: 1, roundScore: 30 },
        { roundNumber: 2, cardsInHand: 2, bid: 0, tricksWon: 0, roundScore: 20 },
      ],
    });
  });
});
