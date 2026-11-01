import type { InboxDelivery } from '../../../domain/social';
import type { RoundResult } from '../../../domain/account/game-result';
import type {
  EntrantStatus,
  MatchStatus,
  Tournament,
  TournamentFormatId,
  TournamentHost,
  TournamentParticipation,
  TournamentRateLimitedAction,
  TournamentStatus,
  TournamentVisibility,
  TrophyTier,
} from '../../../domain/tournament';
import type { MatchTicketClaims } from '../../../tournament';
import type { IPlayerDirectory, ISocialGraphRepository } from '../social';

/*
 * Ports of the tournament context, segregated by concern. The repository persists the aggregate
 * with optimistic concurrency; read models (lists, trophies, achievement history) are separate
 * methods so an adapter can serve them from indexed tables without loading aggregates.
 */

// ---------------------------------------------------------------------------------------------
// Aggregate persistence
// ---------------------------------------------------------------------------------------------

export type SaveTournamentResult = 'saved' | 'conflict';

/** Row of a tournament list (no entrants or matches). */
export interface TournamentSummary {
  id: string;
  name: string;
  description: string;
  format: TournamentFormatId;
  status: TournamentStatus;
  visibility: TournamentVisibility;
  host: TournamentHost;
  entrantCount: number;
  maxEntrants: number;
  maxTableSize: number;
  /** Series rounds (knockouts: the configured value, unused). */
  rounds: number;
  currentRound: number;
  startsAt: number | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  /** Rank 1 of a completed tournament. */
  champion: { userId: string; username: string | null; displayName: string } | null;
}

/** Which public list: open = registration, live = running, finished = completed. */
export type TournamentListStatus = 'open' | 'live' | 'finished';

/**
 * Keyset position: lists are ordered by (sortAt DESC, id DESC) where sortAt is createdAt (open),
 * startedAt (live) or completedAt (finished).
 */
export interface TournamentListPosition {
  sortAt: number;
  id: string;
}

export interface TournamentListQuery {
  status: TournamentListStatus;
  /** Only rows strictly after this position. */
  after?: TournamentListPosition;
  limit: number;
}

/** A tournament the user hosts or entered, with their entry (null when they only host). */
export interface UserTournamentRow {
  summary: TournamentSummary;
  isHost: boolean;
  entry: { status: EntrantStatus; seed: number; finalRank: number | null } | null;
}

export interface ChampionRow {
  tournamentId: string;
  tournamentName: string;
  format: TournamentFormatId;
  completedAt: number;
  entrants: number;
  champion: { userId: string; username: string | null; displayName: string };
}

export interface ITournamentRepository {
  /** The whole aggregate (entrants, matches with results, awards), or null. */
  get(id: string): Promise<Tournament | null>;
  /**
   * Persists the aggregate atomically if the stored version still equals `expectedVersion`
   * (0 = insert a new tournament) and stores `tournament.version` (expectedVersion + 1).
   * Anything else answers 'conflict' and changes nothing.
   */
  save(tournament: Tournament, expectedVersion: number): Promise<SaveTournamentResult>;
  /** Public tournaments only (private ones are never listed). */
  list(query: TournamentListQuery): Promise<TournamentSummary[]>;
  /** Tournaments the user hosts or entered (any visibility, cancelled included), newest first. */
  listForUser(userId: string, limit: number): Promise<UserTournamentRow[]>;
  /** Tournaments of this host still in registration or running. */
  countActiveHosted(userId: string): Promise<number>;
  /** Champions of the most recently completed public tournaments. */
  recentChampions(limit: number): Promise<ChampionRow[]>;
  /** Hosted tournaments still in registration (cancelled when the host deletes the account). */
  listOpenHostedIds(userId: string): Promise<string[]>;
  /**
   * Hosted tournaments whose stored status is registration or running. Stored states lag behind
   * due transitions, so callers load each one (TournamentStore.read) before trusting the count.
   */
  listActiveHostedIds(userId: string): Promise<string[]>;
  /**
   * Account deletion: replaces the host's stored handle and name on every tournament they hosted,
   * so a deleted host is never shown, and a released handle never links to another account.
   */
  forgetHost(userId: string, displayName: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------
// Read models for accounts (achievements, trophy cabinet)
// ---------------------------------------------------------------------------------------------

/** A trophy as shown in the cabinet on /account and /u/<username>. */
export interface TrophyRecord {
  tournamentId: string;
  tournamentName: string;
  format: TournamentFormatId;
  awardId: string;
  tier: TrophyTier;
  xp: number;
  awardedAt: number;
  entrants: number;
  finalRank: number | null;
}

/** The user's entry as stored at registration (data export). */
export interface EntryRecord {
  tournamentId: string;
  username: string | null;
  displayName: string;
  level: number;
  seed: number;
  status: EntrantStatus;
  joinedAt: number;
}

/** One stored result of the user at one table (data export). */
export interface MatchResultRecord {
  tournamentId: string;
  matchId: string;
  round: number;
  table: number;
  matchStatus: MatchStatus;
  completedAt: number | null;
  placement: number;
  score: number;
  points: number;
  rounds: RoundResult[];
  noShow: boolean;
  botTakeover: boolean;
}

export interface ITournamentHistoryReader {
  /** Every completed tournament the user played or hosted, oldest first (for achievements). */
  participations(userId: string): Promise<TournamentParticipation[]>;
  /** The user's awards, newest first. */
  trophies(userId: string, limit: number): Promise<TrophyRecord[]>;
  /** The user's entries with their registration snapshot, newest first. */
  entries(userId: string, limit: number): Promise<EntryRecord[]>;
  /** Every stored per-table result of the user, newest first. */
  matchResults(userId: string, limit: number): Promise<MatchResultRecord[]>;
}

// ---------------------------------------------------------------------------------------------
// Collaborators
// ---------------------------------------------------------------------------------------------

/** Signs match tickets with TOURNAMENT_SECRET (see signMatchTicket in shared/tournament). */
export interface ITournamentTicketSigner {
  sign(claims: MatchTicketClaims): Promise<string>;
}

/** Satisfied by InboxNotifier: tournament notifications go through the generic inbox. */
export interface ITournamentInbox {
  deliver(delivery: InboxDelivery): Promise<string>;
}

/**
 * Recomputes stats, XP and achievements of these accounts (e.g. ProgressCalculator with
 * persist: true), so tournament awards unlock achievements without the tournament use cases
 * knowing account internals.
 */
export interface IProgressRefresher {
  refresh(userIds: readonly string[]): Promise<void>;
}

/** Anti-abuse budgets (TOURNAMENT_RATE_LIMITS); adapters fail open when the counter is down. */
export interface ITournamentThrottle {
  allow(action: TournamentRateLimitedAction, subject: string): Promise<boolean>;
}

/** New random ids; `cryptoTournamentIds` from shared/tournament implements it. */
export interface ITournamentIdGenerator {
  tournamentId(): string;
  inviteCode(): string;
}

/** Player lookups (handle, display name, level) reused from the social directory. */
export type ITournamentPlayerDirectory = Pick<IPlayerDirectory, 'findById' | 'getSettings'>;

/** Relationship facts for invites (blocks, friendship), reused from the social graph. */
export type ITournamentRelationships = Pick<ISocialGraphRepository, 'relationshipFacts'>;

/** Optional sink for failures of side effects that must not fail the use case (logging). */
export type TournamentEffectErrorReporter = (effect: string, error: unknown) => void;
