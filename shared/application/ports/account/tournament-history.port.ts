import type { TournamentParticipation } from '../../../domain/tournament/participation';

/**
 * What progress needs from the tournament context: the player's completed tournaments, for award
 * XP and tournament achievements. A narrow slice of ITournamentHistoryReader (ports/tournament),
 * so the account context does not depend on the rest of the tournament ports; the tournament
 * history adapter satisfies both.
 */
export interface ITournamentParticipationReader {
  /** Every completed tournament the user played or hosted, oldest first. */
  participations(userId: string): Promise<TournamentParticipation[]>;
}
