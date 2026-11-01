import type { EntrantRecord } from '../match-records';
import type { Tournament, TournamentFormatId, TournamentSettings } from '../tournament.types';

/** One table of a planned round: the humans (in seating order) and the bots padding it. */
export interface PlannedTable {
  userIds: string[];
  bots: number;
}

/**
 * What a format decides once a round is over (or before the first one):
 * play another round with these tables, or finish. Either way some entrants may be knocked out.
 */
export type RoundDecision =
  | { kind: 'round'; tables: PlannedTable[]; eliminated: string[] }
  | { kind: 'complete'; eliminated: string[] };

/**
 * A tournament format is a strategy (Open/Closed): adding one means a new implementation plus an
 * entry in TOURNAMENT_FORMATS; the aggregate, use cases, persistence and UI stay unchanged.
 * Implementations are pure and deterministic, so concurrent writers plan identical rounds.
 */
export interface ITournamentFormat {
  readonly id: TournamentFormatId;
  readonly name: string;
  readonly description: string;
  /** Format specific setting checks; returns a player-facing message or null when valid. */
  validateSettings(settings: TournamentSettings): string | null;
  /** Rounds a field of `entrants` will play (knockouts: assuming every table is played). */
  expectedRounds(settings: TournamentSettings, entrants: number): number;
  /** Plans the round after `tournament.currentRound` (round 1 when not started) or completes. */
  decideNextRound(tournament: Tournament): RoundDecision;
  /** Orders entrants best first; also the final ranking once the tournament completed. */
  compare(a: EntrantRecord, b: EntrantRecord): number;
  /** The round shown to players, e.g. "Round 2" or "Final". */
  roundLabel(tournament: Tournament, round: number): string;
}
