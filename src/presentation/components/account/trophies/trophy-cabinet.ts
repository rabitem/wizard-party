import type { TrophyView } from '@shared/application/use-cases/tournament';
import type { PublicTrophy, PublicTrophyCounts } from '@shared/domain/account/public-profile';
import { TROPHY_TIERS, getTournamentAward, type TrophyTier } from '@shared/domain/tournament';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { formatDate, ordinal } from '../public/public-profile-format';

/*
 * One shape for the trophy cabinet on /account (the viewer's own TrophyView list) and on
 * /u/<username> (the whitelisted PublicTrophy list), so both render through the same component.
 */

export interface TrophyCabinetEntry {
  key: string;
  awardId: string;
  name: string;
  description: string;
  /** lucide icon name of the award (resolved by TournamentTrophyIcon). */
  icon: string;
  tier: TrophyTier;
  /** null when the tournament is private and the cabinet is public. */
  tournamentName: string | null;
  /** Tournament page, or null when it must not be linked. */
  href: string | null;
  finalRank: number | null;
  entrants: number;
  awardedAt: number;
  /** XP the award granted (own cabinet only). */
  xp: number | null;
}

export type TrophyTierCounts = Record<TrophyTier, number>;

/** Tiers shown as counters in the cabinet header (participation trophies are too common to count). */
export const CABINET_COUNTED_TIERS: readonly TrophyTier[] = ['gold', 'silver', 'bronze', 'special'];

const newestFirst = (a: TrophyCabinetEntry, b: TrophyCabinetEntry) => b.awardedAt - a.awardedAt || a.key.localeCompare(b.key);

/** The viewer's own trophies (names of private tournaments included: the viewer played them). */
export function fromTrophyViews(views: readonly TrophyView[]): TrophyCabinetEntry[] {
  return views
    .map((view) => ({
      key: `${view.tournamentId}:${view.awardId}`,
      awardId: view.awardId,
      name: view.name,
      description: view.description,
      icon: view.icon,
      tier: view.tier,
      tournamentName: view.tournamentName,
      href: TOURNAMENT_ROUTES.detail(view.tournamentId),
      finalRank: view.finalRank,
      entrants: view.entrants,
      awardedAt: view.awardedAt,
      xp: view.xp,
    }))
    .sort(newestFirst);
}

/** A public profile's trophies; awards this build does not know are left out. */
export function fromPublicTrophies(trophies: readonly PublicTrophy[]): TrophyCabinetEntry[] {
  return trophies
    .flatMap((trophy, index): TrophyCabinetEntry[] => {
      const award = getTournamentAward(trophy.awardId);
      if (!award) return [];
      return [
        {
          key: `${trophy.tournamentId ?? `private-${index}`}:${trophy.awardId}`,
          awardId: trophy.awardId,
          name: award.name,
          description: award.description,
          icon: award.icon,
          tier: trophy.tier,
          tournamentName: trophy.tournamentName,
          href: trophy.tournamentId ? TOURNAMENT_ROUTES.detail(trophy.tournamentId) : null,
          finalRank: trophy.finalRank,
          entrants: trophy.entrants,
          awardedAt: trophy.awardedAt,
          xp: null,
        },
      ];
    })
    .sort(newestFirst);
}

/** Awards per tier of the listed entries. */
export function countTrophyTiers(entries: readonly TrophyCabinetEntry[]): TrophyTierCounts {
  const counts = Object.fromEntries(TROPHY_TIERS.map((tier) => [tier, 0])) as TrophyTierCounts;
  for (const entry of entries) counts[entry.tier] += 1;
  return counts;
}

/** Career counts win over the listed entries (a public profile lists only the newest trophies). */
export function cabinetTierCounts(entries: readonly TrophyCabinetEntry[], careerCounts?: PublicTrophyCounts | null): TrophyTierCounts {
  const listed = countTrophyTiers(entries);
  if (!careerCounts) return listed;
  return Object.fromEntries(TROPHY_TIERS.map((tier) => [tier, Math.max(careerCounts[tier] ?? 0, listed[tier])])) as TrophyTierCounts;
}

/** "1st of 12 · Oct 3, 2026", or "12 players · Oct 3, 2026" without a final rank. */
export function trophyCaption(entry: Pick<TrophyCabinetEntry, 'finalRank' | 'entrants' | 'awardedAt'>): string {
  const field = entry.finalRank === null ? `${entry.entrants} players` : `${ordinal(entry.finalRank)} of ${entry.entrants}`;
  return `${field} · ${formatDate(entry.awardedAt)}`;
}

/** The tournament line of an entry; private tournaments stay anonymous on public profiles. */
export function trophyTournamentLabel(entry: Pick<TrophyCabinetEntry, 'tournamentName'>): string {
  return entry.tournamentName ?? 'Private tournament';
}
