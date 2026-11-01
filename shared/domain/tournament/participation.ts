import type { TournamentFormatId, Tournament, TrophyTier } from './tournament.types';

/**
 * A player's part in one completed tournament, as achievements see it (AchievementContext
 * .tournaments). Hosts who did not play get a row too (wasEntrant false), for hosting achievements.
 */
export interface TournamentParticipation {
  tournamentId: string;
  name: string;
  format: TournamentFormatId;
  /** completedAt of the tournament. */
  finishedAt: number;
  /** Size of the field. */
  entrants: number;
  wasHost: boolean;
  wasEntrant: boolean;
  /** 1 = champion; null when the player only hosted. */
  finalRank: number | null;
  matchesPlayed: number;
  tableWins: number;
  roundsPlayed: number;
  /** Rounds the tournament held. */
  totalRounds: number;
  /** Won every table they sat at. */
  flawless: boolean;
  awards: readonly { awardId: string; tier: TrophyTier; xp: number }[];
}

/**
 * The player's participation in a completed tournament: as an entrant, or as a host who did not
 * play. Null when they had no part in it or it did not complete.
 */
export function participationOf(tournament: Tournament, userId: string): TournamentParticipation | null {
  if (tournament.status !== 'completed' || tournament.completedAt === null) return null;
  const entrant = tournament.entrants.find((candidate) => candidate.userId === userId) ?? null;
  const wasHost = tournament.host.userId === userId;
  if (!entrant && !wasHost) return null;
  const final = entrant?.final ?? null;
  return {
    tournamentId: tournament.id,
    name: tournament.name,
    format: tournament.format,
    finishedAt: tournament.completedAt,
    entrants: tournament.entrants.length,
    totalRounds: tournament.currentRound,
    wasHost,
    wasEntrant: entrant !== null,
    finalRank: final ? final.rank : null,
    matchesPlayed: final ? final.matchesPlayed : 0,
    tableWins: final ? final.tableWins : 0,
    roundsPlayed: final ? final.roundsPlayed : 0,
    flawless: final ? final.flawless : false,
    awards: tournament.awards.filter((award) => award.userId === userId).map(({ awardId, tier, xp }) => ({ awardId, tier, xp })),
  };
}

/** Everyone involved in a tournament: its entrants and its host. */
export function involvedUserIds(tournament: Tournament): string[] {
  const ids = new Set(tournament.entrants.map((entrant) => entrant.userId));
  if (tournament.host.userId !== null) ids.add(tournament.host.userId);
  return [...ids];
}

/** Award XP a player earned across tournaments; added to their total XP. */
export function tournamentAwardXp(participations: readonly TournamentParticipation[]): number {
  return participations.reduce((sum, participation) => sum + participation.awards.reduce((acc, award) => acc + award.xp, 0), 0);
}
