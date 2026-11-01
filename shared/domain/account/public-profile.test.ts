import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from './achievements';
import { EMPTY_STATS } from './player-stats';
import { PUBLIC_PROFILE_LIMITS, buildPublicProfile, sanitizeAvatarId, type PublicProfileSource, type PublicProfileTrophySource } from './public-profile';

function trophy(overrides: Partial<PublicProfileTrophySource> = {}): PublicProfileTrophySource {
  return {
    tournamentId: 'springcup01',
    tournamentName: 'Spring Cup',
    visibility: 'public',
    awardId: 'champion',
    tier: 'gold',
    finalRank: 1,
    entrants: 12,
    awardedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function game(overrides: Partial<PublicProfileSource['recentGames'][number]> = {}) {
  return {
    playedAt: 1_700_000_000_000,
    playerCount: 4,
    placement: 1,
    score: 120,
    rounds: [
      { bid: 1, tricksWon: 1, roundScore: 30 },
      { bid: 2, tricksWon: 0, roundScore: -20 },
    ],
    xp: 90,
    pinnedAt: null,
    ...overrides,
  };
}

function source(overrides: Partial<PublicProfileSource> = {}): PublicProfileSource {
  return {
    username: 'merlin',
    displayUsername: 'Merlin',
    tagline: 'I always bid zero.',
    avatar: 'dragon',
    isPublic: true,
    showHistory: false,
    memberSince: 1_600_000_000_000,
    totalXp: 250,
    stats: { ...EMPTY_STATS, gamesPlayed: 4, gamesWon: 1, correctBids: 3, totalBids: 6, totalPlacement: 10 },
    achievements: [],
    pinnedGames: [],
    recentGames: [game()],
    ...overrides,
  };
}

describe('buildPublicProfile', () => {
  it('should return null for missing or private profiles', () => {
    expect(buildPublicProfile(null)).toBeNull();
    expect(buildPublicProfile(source({ isPublic: false }))).toBeNull();
    expect(buildPublicProfile(source({ username: '' }))).toBeNull();
  });

  it('should hide recent games unless the player opted in', () => {
    expect(buildPublicProfile(source())?.recentGames).toBeNull();
    const shown = buildPublicProfile(source({ showHistory: true }));
    expect(shown?.recentGames).toHaveLength(1);
    expect(shown?.recentGames?.[0]).toMatchObject({ won: true, roundsPlayed: 2, correctBids: 1, score: 120 });
  });

  it('should limit and order recent games newest first', () => {
    const recentGames = Array.from({ length: 15 }, (_, i) => game({ playedAt: 1_000 + i }));
    const profile = buildPublicProfile(source({ showHistory: true, recentGames }));
    expect(profile?.recentGames).toHaveLength(PUBLIC_PROFILE_LIMITS.RECENT_GAMES);
    expect(profile?.recentGames?.[0].playedAt).toBe(1_014);
  });

  it('should always show pinned games, newest pin first, capped', () => {
    const pinnedGames = Array.from({ length: 8 }, (_, i) => game({ pinnedAt: 5_000 + i, placement: 2 }));
    const profile = buildPublicProfile(source({ pinnedGames: [...pinnedGames, game({ pinnedAt: null })] }));
    expect(profile?.pinnedGames).toHaveLength(PUBLIC_PROFILE_LIMITS.PINNED_GAMES);
    expect(profile?.pinnedGames[0]).toMatchObject({ pinnedAt: 5_007, won: false });
  });

  it('should never expose private or internal fields', () => {
    const raw = {
      ...source({ showHistory: true, pinnedGames: [game({ pinnedAt: 1 })] }),
      userId: 'user_123',
      email: 'merlin@example.com',
    } as PublicProfileSource;
    const raw2 = raw as unknown as { recentGames: Record<string, unknown>[] };
    raw2.recentGames[0].clientGameId = 'secret-game-id';
    const json = JSON.stringify(buildPublicProfile(raw));
    expect(json).not.toContain('user_123');
    expect(json).not.toContain('merlin@example.com');
    expect(json).not.toContain('secret-game-id');
    expect(json).not.toContain('"rounds"');
    expect(Object.keys(buildPublicProfile(raw) ?? {}).sort()).toEqual(
      ['achievements', 'avatar', 'displayName', 'memberSince', 'pinnedGames', 'progression', 'recentGames', 'stats', 'tagline', 'trophies', 'trophyCounts', 'username'].sort()
    );
  });

  it('should derive level and headline stats', () => {
    const profile = buildPublicProfile(source());
    expect(profile?.progression).toMatchObject({ level: 3, totalXp: 250, levelXp: 0 });
    expect(profile?.stats).toMatchObject({ gamesPlayed: 4, gamesWon: 1, winRate: 0.25, bidAccuracy: 0.5, averagePlacement: 2.5 });
    expect(buildPublicProfile(source({ stats: null }))?.stats.gamesPlayed).toBe(0);
  });

  it('should list known unlocked achievements, newest first', () => {
    const [first, second] = ACHIEVEMENTS;
    const profile = buildPublicProfile(
      source({ achievements: [{ id: first.id, unlockedAt: 1 }, { id: 'removed-achievement', unlockedAt: 3 }, { id: second.id, unlockedAt: 2 }] })
    );
    expect(profile?.achievements).toEqual([{ id: second.id, unlockedAt: 2 }, { id: first.id, unlockedAt: 1 }]);
  });

  it('should fall back for invalid avatars and a display name that spells another name', () => {
    expect(sanitizeAvatarId(null)).toBe('wizard');
    expect(sanitizeAvatarId('"><script>')).toBe('wizard');
    expect(sanitizeAvatarId('dragon')).toBe('dragon');
    expect(buildPublicProfile(source())?.displayName).toBe('Merlin');
    expect(buildPublicProfile(source({ displayUsername: 'Morgana' }))?.displayName).toBe('merlin');
  });

  describe('trophies', () => {
    it('should default to an empty cabinet when the reader loads no trophies', () => {
      const profile = buildPublicProfile(source());
      expect(profile?.trophies).toEqual([]);
      expect(profile?.trophyCounts).toEqual({ gold: 0, silver: 0, bronze: 0, special: 0, participation: 0 });
    });

    it('should list known awards newest first and capped', () => {
      const trophies = Array.from({ length: PUBLIC_PROFILE_LIMITS.TROPHIES + 5 }, (_, i) => trophy({ awardedAt: 1_000 + i }));
      const profile = buildPublicProfile(source({ trophies: [...trophies, trophy({ awardId: 'retired-award', awardedAt: 9_999 })] }));
      expect(profile?.trophies).toHaveLength(PUBLIC_PROFILE_LIMITS.TROPHIES);
      expect(profile?.trophies[0]).toEqual({
        awardId: 'champion',
        tier: 'gold',
        tournamentId: 'springcup01',
        tournamentName: 'Spring Cup',
        finalRank: 1,
        entrants: 12,
        awardedAt: 1_000 + PUBLIC_PROFILE_LIMITS.TROPHIES + 4,
      });
    });

    it('should hide the name and link of private tournaments', () => {
      const profile = buildPublicProfile(source({ trophies: [trophy({ visibility: 'private', tournamentName: 'Secret Club Night' })] }));
      expect(profile?.trophies[0]).toMatchObject({ tournamentId: null, tournamentName: null, awardId: 'champion' });
      expect(JSON.stringify(profile)).not.toContain('Secret Club Night');
    });

    it('should sanitize tier counts', () => {
      const profile = buildPublicProfile(source({ trophyCounts: { gold: 3, silver: -1, bronze: Number.NaN, special: 2.7 } }));
      expect(profile?.trophyCounts).toEqual({ gold: 3, silver: 0, bronze: 0, special: 2, participation: 0 });
    });
  });
});
