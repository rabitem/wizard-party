import { RECORD_RESULT_OUTCOMES } from './tournament.types';

/**
 * What became of a table's result: the tournament's answer to it, or 'rejected' when the tournament
 * refused the report for good (purged tournament, roster mismatch), so it never counted.
 */
export const MATCH_REPORT_OUTCOMES = [...RECORD_RESULT_OUTCOMES, 'rejected'] as const;
export type MatchReportOutcome = (typeof MATCH_REPORT_OUTCOMES)[number];

/**
 * What a tournament match room tells the players at the table (lobby banner, waiting roster,
 * no-show countdown). Sent by the game worker with the room state; account ids are deliberately
 * not part of it.
 */
export interface TournamentMatchRoomSeat {
  /** Seat name from the ticket. */
  name: string;
  seat: number;
  /** Currently connected and seated. */
  joined: boolean;
  /** Did not show up before the no-show deadline; a bot plays the seat. */
  noShow: boolean;
}

export interface TournamentMatchRoomState {
  tournamentId: string;
  matchId: string;
  /** e.g. "Spring Cup · Round 2 · Table 3". */
  label: string;
  round: number;
  table: number;
  roster: TournamentMatchRoomSeat[];
  bots: number;
  /** When the match starts on its own (everyone seated + countdown), or null. */
  autoStartAt: number | null;
  /** When absent roster members become no-shows (first join + NO_SHOW_GRACE_MS), or null before anyone joined. */
  noShowDeadlineAt: number | null;
  /** The result was handed to the outbox (the game is over). */
  reported: boolean;
  /**
   * The tournament's answer once the result was delivered ('duplicate' counts as recorded;
   * 'superseded': the table was voided before the result arrived, so the game does not count;
   * 'rejected': the tournament refused the report for good). Null until then.
   */
  reportOutcome: MatchReportOutcome | null;
  /** The tournament voids the table at this time if it is not finished; null for older tickets without it. */
  deadlineAt: number | null;
  /** The deadline passed before the game could start: the table was voided, nothing is played here. */
  expired: boolean;
}

/**
 * Placements for a finished match: competition ranking by final score (1, 1, 3, ...) over every
 * seat, bots included; seats of no-shows are ranked last (table size) whatever their bot scored.
 */
export function rankMatchSeats(seats: readonly { id: string; score: number; noShow: boolean }[]): Map<string, number> {
  const size = seats.length;
  const present = seats.filter((seat) => !seat.noShow).sort((a, b) => b.score - a.score);
  const placements = new Map<string, number>();
  let previousPlacement = 0;
  present.forEach((seat, index) => {
    const previous = present[index - 1];
    // Equal scores share the better placement (1, 2, 2, 4).
    previousPlacement = previous && previous.score === seat.score ? previousPlacement : index + 1;
    placements.set(seat.id, previousPlacement);
  });
  for (const seat of seats) if (seat.noShow) placements.set(seat.id, size);
  return placements;
}
