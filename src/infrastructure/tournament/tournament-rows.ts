import {
  DEFAULT_TOURNAMENT_SETTINGS,
  TOURNAMENT_AWARDS,
  type Entrant,
  type EntrantStatus,
  type MatchLiveState,
  type MatchPlayerResult,
  type MatchStatus,
  type Tournament,
  type TournamentAward,
  type TournamentFormatId,
  type TournamentMatch,
  type TournamentSettings,
  type TournamentStatus,
  type TournamentVisibility,
  type TrophyTier,
} from '@shared/domain/tournament';
import { ensureRulesetConfig } from '@shared/domain/value-objects';
import type { RoundResult } from '@shared/domain/account';
import type { ChampionRow, TournamentSummary, UserTournamentRow } from '@shared/application/ports/tournament';

/*
 * Rows of db/migrations/0108_tournaments.sql (plus 0109, match activity) and their mapping to the
 * aggregate, kept free of I/O so the round trip (aggregate -> save payload -> rows -> aggregate) is
 * unit tested; the payload is built in tournament-save-payload.ts. Timestamps come back from the
 * driver as Date or ISO string and travel to Postgres as ISO strings, which keeps millisecond values
 * exact (keyset cursors compare them for equality).
 */

type Timestamp = string | Date;

export const toTime = (value: Timestamp): number => new Date(value).getTime();
export const toOptionalTime = (value: Timestamp | null): number | null => (value === null ? null : toTime(value));

export interface TournamentRow {
  id: string;
  name: string;
  description: string;
  host_user_id: string | null;
  host_username: string | null;
  host_display_name: string;
  format: TournamentFormatId;
  settings: unknown;
  visibility: TournamentVisibility;
  invite_code: string | null;
  starts_at: Timestamp | null;
  status: TournamentStatus;
  current_round: number;
  version: number;
  created_at: Timestamp;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  cancelled_at: Timestamp | null;
}

export interface EntrantRow {
  user_id: string;
  username: string | null;
  display_name: string;
  level: number;
  seed: number;
  status: EntrantStatus;
  joined_at: Timestamp;
  final_rank: number | null;
  final_points: number | null;
  final_table_wins: number | null;
  final_matches_played: number | null;
  final_rounds_played: number | null;
  final_total_score: number | null;
  final_flawless: boolean | null;
}

export interface MatchRow {
  id: string;
  round: number;
  table_number: number;
  room_code: string;
  seats: unknown;
  status: MatchStatus;
  created_at: Timestamp;
  deadline_at: Timestamp;
  outcome: 'played' | 'void' | null;
  game_id: string | null;
  completed_at: Timestamp | null;
  /** Live state (0109); all three are null until the worker reported the game. */
  last_activity_at: Timestamp | null;
  live_round: number | null;
  live_max_rounds: number | null;
}

export interface MatchResultRow {
  match_id: string;
  user_id: string;
  placement: number;
  score: number;
  points: number;
  rounds: unknown;
  no_show: boolean;
  bot_takeover: boolean;
}

export interface AwardRow {
  user_id: string;
  award_id: string;
  tier: TrophyTier;
  xp: number;
  awarded_at: Timestamp;
}

/** A tournament row plus the list columns (entrant count, champion) of the summary queries. */
export interface SummaryRow extends TournamentRow {
  entrant_count: number;
  champion_user_id: string | null;
  champion_username: string | null;
  champion_display_name: string | null;
}

export interface UserTournamentDbRow extends SummaryRow {
  is_host: boolean;
  entry_status: EntrantStatus | null;
  entry_seed: number | null;
  entry_final_rank: number | null;
}

export interface ChampionDbRow {
  tournament_id: string;
  tournament_name: string;
  format: TournamentFormatId;
  completed_at: Timestamp;
  entrants: number;
  user_id: string;
  username: string | null;
  display_name: string;
}

// ---------------------------------------------------------------------------------------------
// Rows -> aggregate
// ---------------------------------------------------------------------------------------------

/**
 * Stored settings were validated when saved; rules added to the ruleset later are filled in with
 * their defaults, so old tournaments keep loading after the game grows new options.
 */
export function toSettings(value: unknown): TournamentSettings {
  const stored = typeof value === 'object' && value !== null ? (value as Partial<TournamentSettings>) : {};
  return { ...DEFAULT_TOURNAMENT_SETTINGS, ...stored, rulesetConfig: ensureRulesetConfig(stored.rulesetConfig) };
}

function toRounds(value: unknown): RoundResult[] {
  if (!Array.isArray(value)) return [];
  return value.map((round: Partial<RoundResult>) => ({ bid: Number(round.bid), tricksWon: Number(round.tricksWon), roundScore: Number(round.roundScore) }));
}

function toSeats(value: unknown): TournamentMatch['seats'] {
  if (!Array.isArray(value)) return [];
  return value.map((seat: { seat: number; userId: string | null }) => ({ seat: Number(seat.seat), userId: seat.userId ?? null }));
}

function toEntrant(row: EntrantRow): Entrant {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    level: row.level,
    joinedAt: toTime(row.joined_at),
    seed: row.seed,
    status: row.status,
    final:
      row.final_rank === null
        ? null
        : {
            rank: row.final_rank,
            points: row.final_points ?? 0,
            tableWins: row.final_table_wins ?? 0,
            matchesPlayed: row.final_matches_played ?? 0,
            roundsPlayed: row.final_rounds_played ?? 0,
            totalScore: row.final_total_score ?? 0,
            flawless: row.final_flawless ?? false,
          },
  };
}

function toPlayerResult(row: MatchResultRow): MatchPlayerResult {
  return {
    userId: row.user_id,
    placement: row.placement,
    score: row.score,
    points: row.points,
    rounds: toRounds(row.rounds),
    noShow: row.no_show,
    botTakeover: row.bot_takeover,
  };
}

/** Results have no stored order; restore a stable one: placement, then deal order at the table. */
function orderResults(players: MatchPlayerResult[], seats: TournamentMatch['seats']): MatchPlayerResult[] {
  const seatOf = (userId: string) => seats.findIndex((seat) => seat.userId === userId);
  return players.sort((a, b) => a.placement - b.placement || seatOf(a.userId) - seatOf(b.userId));
}

function toLiveState(row: MatchRow): MatchLiveState | null {
  if (row.last_activity_at === null || row.live_round === null || row.live_max_rounds === null) return null;
  return { round: row.live_round, maxRounds: row.live_max_rounds, lastActivityAt: toTime(row.last_activity_at) };
}

function toMatch(row: MatchRow, results: readonly MatchResultRow[]): TournamentMatch {
  const seats = toSeats(row.seats);
  return {
    id: row.id,
    round: row.round,
    table: row.table_number,
    roomCode: row.room_code,
    seats,
    status: row.status,
    createdAt: toTime(row.created_at),
    deadlineAt: toTime(row.deadline_at),
    live: toLiveState(row),
    result:
      row.status === 'pending' || row.outcome === null || row.completed_at === null
        ? null
        : {
            outcome: row.outcome,
            gameId: row.game_id,
            completedAt: toTime(row.completed_at),
            players: orderResults(results.map(toPlayerResult), seats),
          },
  };
}

function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const AWARD_ORDER = new Map(TOURNAMENT_AWARDS.map((definition, index) => [definition.id, index]));

/** Awards in registry order, recipients by final rank: the order computeAwards produced them in. */
function orderAwards(awards: TournamentAward[], entrants: readonly Entrant[]): TournamentAward[] {
  const rankOf = new Map(entrants.map((entrant) => [entrant.userId, entrant.final?.rank ?? Number.MAX_SAFE_INTEGER]));
  const orderOf = (awardId: string) => AWARD_ORDER.get(awardId) ?? AWARD_ORDER.size;
  return awards.sort(
    (a, b) =>
      orderOf(a.awardId) - orderOf(b.awardId) ||
      (rankOf.get(a.userId) ?? Number.MAX_SAFE_INTEGER) - (rankOf.get(b.userId) ?? Number.MAX_SAFE_INTEGER) ||
      compareIds(a.userId, b.userId)
  );
}

export interface TournamentRows {
  tournament: TournamentRow;
  /** Ordered by seed. */
  entrants: readonly EntrantRow[];
  /** Ordered by round, then table. */
  matches: readonly MatchRow[];
  results: readonly MatchResultRow[];
  awards: readonly AwardRow[];
}

export function toTournament({ tournament: row, entrants, matches, results, awards }: TournamentRows): Tournament {
  const resultsByMatch = new Map<string, MatchResultRow[]>();
  for (const result of results) {
    const list = resultsByMatch.get(result.match_id) ?? [];
    list.push(result);
    resultsByMatch.set(result.match_id, list);
  }
  const entrantList = entrants.map(toEntrant);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    host: { userId: row.host_user_id, username: row.host_username, displayName: row.host_display_name },
    format: row.format,
    settings: toSettings(row.settings),
    visibility: row.visibility,
    inviteCode: row.invite_code,
    startsAt: toOptionalTime(row.starts_at),
    status: row.status,
    currentRound: row.current_round,
    version: row.version,
    createdAt: toTime(row.created_at),
    startedAt: toOptionalTime(row.started_at),
    completedAt: toOptionalTime(row.completed_at),
    cancelledAt: toOptionalTime(row.cancelled_at),
    entrants: entrantList,
    matches: matches.map((match) => toMatch(match, resultsByMatch.get(match.id) ?? [])),
    awards: orderAwards(
      awards.map((award) => ({ userId: award.user_id, awardId: award.award_id, tier: award.tier, xp: award.xp, awardedAt: toTime(award.awarded_at) })),
      entrantList
    ),
  };
}

export function toSummary(row: SummaryRow): TournamentSummary {
  const settings = toSettings(row.settings);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    format: row.format,
    status: row.status,
    visibility: row.visibility,
    host: { userId: row.host_user_id, username: row.host_username, displayName: row.host_display_name },
    entrantCount: row.entrant_count,
    maxEntrants: settings.maxEntrants,
    maxTableSize: settings.maxTableSize,
    rounds: settings.rounds,
    currentRound: row.current_round,
    startsAt: toOptionalTime(row.starts_at),
    createdAt: toTime(row.created_at),
    startedAt: toOptionalTime(row.started_at),
    completedAt: toOptionalTime(row.completed_at),
    cancelledAt: toOptionalTime(row.cancelled_at),
    champion:
      row.status === 'completed' && row.champion_user_id !== null
        ? { userId: row.champion_user_id, username: row.champion_username, displayName: row.champion_display_name ?? '' }
        : null,
  };
}

export function toUserTournamentRow(row: UserTournamentDbRow): UserTournamentRow {
  return {
    summary: toSummary(row),
    isHost: row.is_host,
    entry: row.entry_status === null ? null : { status: row.entry_status, seed: row.entry_seed ?? 0, finalRank: row.entry_final_rank },
  };
}

export function toChampionRow(row: ChampionDbRow): ChampionRow {
  return {
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name,
    format: row.format,
    completedAt: toTime(row.completed_at),
    entrants: row.entrants,
    champion: { userId: row.user_id, username: row.username, displayName: row.display_name },
  };
}
