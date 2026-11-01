import { getTournamentFormat } from './formats';
import { bidAccuracy, collectEntrantRecords, type EntrantRecord, type RecordOptions } from './match-records';
import type { EntrantStatus, Tournament } from './tournament.types';

/** One row of the standings table. Ranks are unique (the seed breaks every remaining tie). */
export interface Standing {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  seed: number;
  status: EntrantStatus;
  points: number;
  tableWins: number;
  totalScore: number;
  /** Share of bids hit exactly (0..1); null before the first bid. */
  bidAccuracy: number | null;
  matchesPlayed: number;
  roundsPlayed: number;
  /** Highest round the player sat at; the knockout "round reached". */
  reachedRound: number;
  noShows: number;
}

/** Entrant records sorted best first by the tournament's format. */
export function rankRecords(tournament: Tournament, options: RecordOptions = {}): EntrantRecord[] {
  return collectEntrantRecords(tournament, options).sort(getTournamentFormat(tournament.format).compare);
}

export function computeStandings(tournament: Tournament): Standing[] {
  return rankRecords(tournament).map((record, index) => ({
    rank: index + 1,
    userId: record.entrant.userId,
    username: record.entrant.username,
    displayName: record.entrant.displayName,
    seed: record.entrant.seed,
    status: record.entrant.status,
    points: record.points,
    tableWins: record.tableWins,
    totalScore: record.totalScore,
    bidAccuracy: bidAccuracy(record),
    matchesPlayed: record.matchesPlayed,
    roundsPlayed: record.roundsPlayed,
    reachedRound: record.reachedRound,
    noShows: record.noShows,
  }));
}
