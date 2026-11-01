import { describe, expect, it } from 'vitest';

import { sanitizeCommunityStats } from './community-stats';

describe('sanitizeCommunityStats', () => {
  it('should coerce storage values to non-negative integers', () => {
    expect(sanitizeCommunityStats({ playingNow: '3', playersToday: 12.7, gamesToday: -1, registeredPlayers: null })).toEqual({
      playingNow: 3,
      playersToday: 12,
      gamesToday: 0,
      registeredPlayers: 0,
    });
  });

  it('should never report fewer players today than playing now', () => {
    expect(sanitizeCommunityStats({ playingNow: 5, playersToday: 2 })).toMatchObject({ playingNow: 5, playersToday: 5 });
  });

  it('should treat missing data as zero', () => {
    expect(sanitizeCommunityStats({})).toEqual({ playingNow: 0, playersToday: 0, gamesToday: 0, registeredPlayers: 0 });
  });
});
