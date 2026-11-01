import { TOURNAMENT_POINTS } from './tournament.constants';
import type { Entrant, MatchPlayerResult, Tournament, TournamentMatch } from './tournament.types';

/**
 * Tournament points for a placement, normalized across table sizes:
 * round(MAX_POINTS * (size - placement) / (size - 1)) plus WIN_BONUS for the table winner.
 */
export function placementPoints(placement: number, tableSize: number): number {
  if (tableSize < 2 || placement < 1 || placement > tableSize) return 0;
  const share = Math.round((TOURNAMENT_POINTS.MAX_POINTS * (tableSize - placement)) / (tableSize - 1));
  return share + (placement === 1 ? TOURNAMENT_POINTS.WIN_BONUS : 0);
}

/** Points of one reported result: no-shows earn nothing. */
export function resultPoints(result: Pick<MatchPlayerResult, 'placement' | 'noShow'>, tableSize: number): number {
  return result.noShow ? 0 : placementPoints(result.placement, tableSize);
}

/** The entrant's most recent table (the round they reached). */
export interface LastTable {
  round: number;
  tableSize: number;
  pending: boolean;
  /** Ordering key at that table: 0 while pending, size for void, size + 1 for a no-show. */
  placementKey: number;
  score: number;
  /** The entrant actually played that table (completed, not a no-show): its placement is earned. */
  played: boolean;
}

/** Everything the rankings and awards need about one entrant, aggregated over their matches. */
export interface EntrantRecord {
  entrant: Entrant;
  points: number;
  tableWins: number;
  totalScore: number;
  correctBids: number;
  totalBids: number;
  /** Results actually played (not void, not a no-show). */
  matchesPlayed: number;
  /** Rounds the entrant was seated in, whatever the outcome. */
  roundsPlayed: number;
  noShows: number;
  /** Seated in a match that was voided. */
  voided: number;
  highestMatchScore: number | null;
  /** Highest round the entrant was seated in (0 before their first table). */
  reachedRound: number;
  last: LastTable | null;
}

export interface RecordOptions {
  /** Only matches up to this round count (e.g. the standings after round 1). */
  throughRound?: number;
}

function emptyRecord(entrant: Entrant): EntrantRecord {
  return {
    entrant,
    points: 0,
    tableWins: 0,
    totalScore: 0,
    correctBids: 0,
    totalBids: 0,
    matchesPlayed: 0,
    roundsPlayed: 0,
    noShows: 0,
    voided: 0,
    highestMatchScore: null,
    reachedRound: 0,
    last: null,
  };
}

function lastTableOf(match: TournamentMatch, result: MatchPlayerResult | undefined): LastTable {
  const tableSize = match.seats.length;
  const base = { round: match.round, tableSize };
  if (match.status === 'pending') return { ...base, pending: true, placementKey: 0, score: 0, played: false };
  if (match.status === 'void' || !result) return { ...base, pending: false, placementKey: tableSize, score: 0, played: false };
  if (result.noShow) return { ...base, pending: false, placementKey: tableSize + 1, score: 0, played: false };
  return { ...base, pending: false, placementKey: result.placement, score: result.score, played: true };
}

function addMatch(record: EntrantRecord, match: TournamentMatch): void {
  const result = match.result?.players.find((player) => player.userId === record.entrant.userId);
  record.roundsPlayed += 1;
  if (match.round >= record.reachedRound) {
    record.reachedRound = match.round;
    record.last = lastTableOf(match, result);
  }
  if (match.status === 'void') {
    record.voided += 1;
    return;
  }
  if (match.status !== 'completed' || !result) return;
  if (result.noShow) {
    record.noShows += 1;
    return;
  }
  record.matchesPlayed += 1;
  record.points += result.points;
  record.totalScore += result.score;
  if (result.placement === 1) record.tableWins += 1;
  record.highestMatchScore = record.highestMatchScore === null ? result.score : Math.max(record.highestMatchScore, result.score);
  for (const round of result.rounds) {
    record.totalBids += 1;
    if (round.bid === round.tricksWon) record.correctBids += 1;
  }
}

/** Aggregates every entrant's matches. Seats of players who are no longer entrants are ignored. */
export function collectEntrantRecords(tournament: Tournament, options: RecordOptions = {}): EntrantRecord[] {
  const records = new Map(tournament.entrants.map((entrant) => [entrant.userId, emptyRecord(entrant)]));
  for (const match of tournament.matches) {
    if (options.throughRound !== undefined && match.round > options.throughRound) continue;
    for (const seat of match.seats) {
      const record = seat.userId === null ? undefined : records.get(seat.userId);
      if (record) addMatch(record, match);
    }
  }
  return [...records.values()];
}

/** Share of bids hit exactly; null without bids. */
export function bidAccuracy(record: Pick<EntrantRecord, 'correctBids' | 'totalBids'>): number | null {
  return record.totalBids === 0 ? null : record.correctBids / record.totalBids;
}

const accuracyKey = (record: EntrantRecord) => bidAccuracy(record) ?? -1;

/** Series order: points, table wins, cumulative game score, bid accuracy, then seed. */
export function compareSeries(a: EntrantRecord, b: EntrantRecord): number {
  return (
    b.points - a.points ||
    b.tableWins - a.tableWins ||
    b.totalScore - a.totalScore ||
    accuracyKey(b) - accuracyKey(a) ||
    a.entrant.seed - b.entrant.seed
  );
}

/**
 * Knockout order: the round reached (later is better), then the placement at that table (players
 * still at a pending table first), then the score at that table, then total points, then seed.
 * After the final this is exactly final-table placement followed by the eliminated players.
 */
export function compareKnockout(a: EntrantRecord, b: EntrantRecord): number {
  const aLast = a.last ?? { placementKey: Number.MAX_SAFE_INTEGER, score: 0 };
  const bLast = b.last ?? { placementKey: Number.MAX_SAFE_INTEGER, score: 0 };
  return (
    b.reachedRound - a.reachedRound ||
    aLast.placementKey - bLast.placementKey ||
    bLast.score - aLast.score ||
    b.points - a.points ||
    a.entrant.seed - b.entrant.seed
  );
}

/** Matches of one round, by table. */
export function matchesOfRound(tournament: Tournament, round: number): TournamentMatch[] {
  return tournament.matches.filter((match) => match.round === round).sort((a, b) => a.table - b.table);
}
