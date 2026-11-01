import type { RoundResult } from '../account/game-result';
import type { BotDifficulty } from '../bot-ai/types';
import type { IRulesetConfig } from '../value-objects/ruleset-config';

/*
 * The Tournament aggregate as plain, immutable data. Every state change is a pure function in
 * tournament.ts that returns a new value (or throws a TournamentError), so the same rules run in
 * use cases, tests and, if ever needed, on the client.
 */

export const TOURNAMENT_FORMAT_IDS = ['series', 'knockout'] as const;
export type TournamentFormatId = (typeof TOURNAMENT_FORMAT_IDS)[number];

export const TOURNAMENT_STATUSES = ['registration', 'running', 'completed', 'cancelled'] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_VISIBILITIES = ['public', 'private'] as const;
export type TournamentVisibility = (typeof TOURNAMENT_VISIBILITIES)[number];

/**
 * registered: signed up, tournament not started. active: in play (or finished without being
 * knocked out). eliminated: knocked out (knockout format). Withdrawing during registration removes
 * the entry altogether.
 */
export type EntrantStatus = 'registered' | 'active' | 'eliminated';

export type MatchStatus = 'pending' | 'completed' | 'void';

export interface TournamentSettings {
  maxEntrants: number;
  /** Largest table; tables are balanced between TOURNAMENT_LIMITS.MIN_TABLE_SIZE and this. */
  maxTableSize: number;
  /** Rounds of a series. Kept (but unused) for knockouts so switching formats keeps the choice. */
  rounds: number;
  /** Knockout: players advancing per table; null = half the table, rounded up. */
  advancePerTable: number | null;
  rulesetConfig: IRulesetConfig;
  /** Pad tables that cannot be filled with humans with bots (bots never appear in standings). */
  fillWithBots: boolean;
  botDifficulty: BotDifficulty;
}

/** A player as shown in a tournament: snapshot taken at registration (names may change later). */
export interface TournamentPlayerRef {
  userId: string;
  /** Lowercase handle. */
  username: string | null;
  displayName: string;
}

/** The host; userId becomes null when the host deletes their account (the tournament stays). */
export interface TournamentHost {
  userId: string | null;
  username: string | null;
  displayName: string;
}

/** Final numbers of an entrant, frozen when the tournament completes. */
export interface EntrantFinal {
  rank: number;
  points: number;
  tableWins: number;
  matchesPlayed: number;
  roundsPlayed: number;
  totalScore: number;
  /** Won every table they sat at (and sat at least one). */
  flawless: boolean;
}

export interface Entrant extends TournamentPlayerRef {
  /** Account level at registration; seeds the field at start. */
  level: number;
  joinedAt: number;
  /** Join order during registration; strength order (level, then join time) from the start on. */
  seed: number;
  status: EntrantStatus;
  final: EntrantFinal | null;
}

/** A seat at a match table; userId null is a bot. */
export interface MatchSeat {
  seat: number;
  userId: string | null;
}

/** One human's result at a table, as attested by the game worker. */
export interface MatchPlayerResult {
  userId: string;
  /** 1 = table winner. Counted among every seat, bots included; ties share a placement. */
  placement: number;
  score: number;
  /** Tournament points earned (placementPoints, 0 for no-shows and void matches). */
  points: number;
  rounds: readonly RoundResult[];
  /** Never joined the table; a bot played the seat. Ranks below everyone present. */
  noShow: boolean;
  /** Disconnected mid-game and a bot finished the seat. */
  botTakeover: boolean;
}

export interface MatchResult {
  /** played: reported by the worker. void: timed out or resolved by the host (all forfeit). */
  outcome: 'played' | 'void';
  gameId: string | null;
  completedAt: number;
  players: readonly MatchPlayerResult[];
}

/**
 * How far a pending table has got, as last reported by the game worker (a signed progress ping at
 * the start and at every round end). Proof of life: the host can't void a table that is playing.
 */
export interface MatchLiveState {
  /** The round in play (1-based): after round r ended the worker already names r + 1. */
  round: number;
  maxRounds: number;
  /** When the worker last reported the table (never later than the server received it). */
  lastActivityAt: number;
}

export interface TournamentMatch {
  /** Deterministic: `${tournamentId}-${round}-${table}` (see matchIdFor). */
  id: string;
  round: number;
  /** 1-based table number within the round. */
  table: number;
  /** Deterministic from the id (see matchRoomCode); only ticket holders can join it. */
  roomCode: string;
  seats: readonly MatchSeat[];
  status: MatchStatus;
  createdAt: number;
  /** The match is voided when still pending at this time. */
  deadlineAt: number;
  /** Null until the worker reported the game's start (or when an older worker never does). */
  live: MatchLiveState | null;
  result: MatchResult | null;
}

export const TROPHY_TIERS = ['gold', 'silver', 'bronze', 'special', 'participation'] as const;
export type TrophyTier = (typeof TROPHY_TIERS)[number];

export interface TournamentAward {
  userId: string;
  awardId: string;
  tier: TrophyTier;
  xp: number;
  awardedAt: number;
}

export interface Tournament {
  /** URL-safe, see isTournamentId. */
  id: string;
  name: string;
  description: string;
  host: TournamentHost;
  format: TournamentFormatId;
  settings: TournamentSettings;
  visibility: TournamentVisibility;
  /** Required to view and register when private; null for public tournaments. */
  inviteCode: string | null;
  /** Scheduled start (informational, plus lazy auto-start when enough players registered). */
  startsAt: number | null;
  status: TournamentStatus;
  /** 0 before the start, then the round being played (or the last one played). */
  currentRound: number;
  /** Optimistic concurrency token; bumped by every save. */
  version: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  entrants: readonly Entrant[];
  matches: readonly TournamentMatch[];
  awards: readonly TournamentAward[];
}

/** What a player brings when registering (read server-side from their account, never the client). */
export interface EntrantProfile extends TournamentPlayerRef {
  level: number;
}

/** What recording a worker-attested result did (see recordMatchResult); the worker shows it at the table. */
export const RECORD_RESULT_OUTCOMES = ['recorded', 'duplicate', 'superseded', 'ignored'] as const;
export type RecordResultOutcome = (typeof RECORD_RESULT_OUTCOMES)[number];

/** A match result as reported by the game worker, already signature-verified and parsed. */
export interface MatchReport {
  matchId: string;
  roomCode: string;
  gameId: string;
  completedAt: number;
  players: readonly Omit<MatchPlayerResult, 'points'>[];
}

/** A progress ping of the game worker (game started or a round ended), signature-verified and parsed. */
export interface MatchProgress {
  matchId: string;
  roomCode: string;
  /** The round in play, 1..maxRounds. */
  round: number;
  maxRounds: number;
  /** When the worker sent it (its clock). */
  at: number;
}
