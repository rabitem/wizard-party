import { describe, expect, it } from 'vitest';

import type { TrophyView } from '@shared/application/use-cases/tournament';
import type { PublicTrophy } from '@shared/domain/account/public-profile';

import { cabinetTierCounts, countTrophyTiers, fromPublicTrophies, fromTrophyViews, trophyCaption, trophyTournamentLabel } from './trophy-cabinet';

const DAY = 24 * 60 * 60 * 1000;
const OCT_3_2026 = Date.UTC(2026, 9, 3);

function view(overrides: Partial<TrophyView> = {}): TrophyView {
  return {
    tournamentId: 'springcup01',
    tournamentName: 'Spring Cup',
    format: 'series',
    awardId: 'champion',
    tier: 'gold',
    xp: 420,
    awardedAt: OCT_3_2026,
    entrants: 12,
    finalRank: 1,
    name: 'Champion',
    description: 'Won the tournament.',
    icon: 'trophy',
    ...overrides,
  };
}

function publicTrophy(overrides: Partial<PublicTrophy> = {}): PublicTrophy {
  return {
    awardId: 'champion',
    tier: 'gold',
    tournamentId: 'springcup01',
    tournamentName: 'Spring Cup',
    finalRank: 1,
    entrants: 12,
    awardedAt: OCT_3_2026,
    ...overrides,
  };
}

describe('trophy cabinet', () => {
  it('should list the own trophies of the viewer newest first with links and XP', () => {
    const entries = fromTrophyViews([view(), view({ awardId: 'oracle', tier: 'special', name: 'Oracle', awardedAt: OCT_3_2026 + DAY })]);
    expect(entries.map(({ awardId }) => awardId)).toEqual(['oracle', 'champion']);
    expect(entries[1]).toMatchObject({ href: '/tournaments/springcup01', xp: 420, tournamentName: 'Spring Cup', icon: 'trophy' });
  });

  it('should name public awards from the registry and keep private tournaments unlinked', () => {
    const entries = fromPublicTrophies([publicTrophy({ tournamentId: null, tournamentName: null })]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ name: 'Champion', href: null, tournamentName: null, xp: null });
    expect(trophyTournamentLabel(entries[0])).toBe('Private tournament');
  });

  it('should leave out public awards this build does not know', () => {
    expect(fromPublicTrophies([publicTrophy({ awardId: 'retired-award' })])).toEqual([]);
  });

  it('should give private trophies distinct keys', () => {
    const entries = fromPublicTrophies([publicTrophy({ tournamentId: null }), publicTrophy({ tournamentId: null, awardedAt: OCT_3_2026 - DAY })]);
    expect(new Set(entries.map(({ key }) => key)).size).toBe(2);
  });

  it('should count tiers, preferring career counts over the listed trophies', () => {
    const entries = fromPublicTrophies([publicTrophy(), publicTrophy({ awardId: 'finisher', tier: 'participation' })]);
    expect(countTrophyTiers(entries)).toEqual({ gold: 1, silver: 0, bronze: 0, special: 0, participation: 1 });
    expect(cabinetTierCounts(entries, { gold: 5, silver: 2, bronze: 0, special: 0, participation: 0 })).toEqual({ gold: 5, silver: 2, bronze: 0, special: 0, participation: 1 });
    expect(cabinetTierCounts(entries, null)).toEqual(countTrophyTiers(entries));
  });

  it('should caption the placement, field and date', () => {
    expect(trophyCaption({ finalRank: 2, entrants: 16, awardedAt: OCT_3_2026 })).toBe('2nd of 16 · Oct 3, 2026');
    expect(trophyCaption({ finalRank: null, entrants: 9, awardedAt: OCT_3_2026 })).toBe('9 players · Oct 3, 2026');
  });
});
