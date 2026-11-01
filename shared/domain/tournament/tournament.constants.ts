import { ROOM_PLAYER_LIMITS } from '../entities/game';

/**
 * Limits of the tournament context. Shared by client (form bounds), server (validation) and the
 * game worker (match rooms) so all three work against the same numbers.
 */
export const TOURNAMENT_LIMITS = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 48,
  DESCRIPTION_MAX_LENGTH: 280,
  /** Entrants needed to start without bots (a table needs three players). */
  MIN_ENTRANTS: ROOM_PLAYER_LIMITS.MIN,
  /** With bot padding two humans can already play a table. */
  MIN_ENTRANTS_WITH_BOTS: 2,
  MAX_ENTRANTS_LOWER_BOUND: ROOM_PLAYER_LIMITS.MIN,
  MAX_ENTRANTS: 64,
  DEFAULT_MAX_ENTRANTS: 16,
  MIN_TABLE_SIZE: ROOM_PLAYER_LIMITS.MIN,
  MAX_TABLE_SIZE: ROOM_PLAYER_LIMITS.MAX,
  /** Any field of 3+ splits into tables of 3–5, so the default never needs bots. */
  DEFAULT_MAX_TABLE_SIZE: 5,
  /** Rounds of a series. */
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 7,
  DEFAULT_ROUNDS: 3,
  /** Tournaments a player can host at the same time (registration or running). */
  MAX_ACTIVE_HOSTED: 3,
  /** Players a host can invite with one request. */
  MAX_INVITES_PER_REQUEST: 20,
  /** Upper bound of an account id in requests (Better Auth ids are far shorter); bounds the input. */
  MAX_PLAYER_ID_LENGTH: 64,
  LIST_PAGE_SIZE: 20,
  MAX_LIST_PAGE_SIZE: 50,
  /** Tournaments listed on "my tournaments". */
  MY_TOURNAMENTS_LIMIT: 50,
  /** Champions shown on the tournaments page strip. */
  RECENT_CHAMPIONS: 8,
  /** A scheduled start must lie at least this far ahead (and at most MAX ahead). */
  STARTS_AT_MIN_AHEAD_MS: 60 * 1000,
  STARTS_AT_MAX_AHEAD_MS: 60 * 24 * 60 * 60 * 1000,
  /** Optimistic concurrency: a writer reloads and retries this often before giving up. */
  MAX_SAVE_ATTEMPTS: 5,
} as const;

/** Timings of the lazy state machine and of match rooms. */
export const TOURNAMENT_TIMING = {
  /** A match not reported after this long is voided (everyone at the table forfeits). */
  MATCH_HARD_TIMEOUT_MS: 3 * 60 * 60 * 1000,
  /** After this long the host may resolve (void) a match that is stuck. */
  MATCH_STALE_AFTER_MS: 75 * 60 * 1000,
  /**
   * A table the game worker reported activity for (game start, round end, heartbeat) within this
   * long is still being played: the host can't resolve it, however long it has been pending.
   */
  MATCH_ACTIVITY_GRACE_MS: 10 * 60 * 1000,
  /**
   * Worker: during a round that runs long (late rounds, big tables, turn timers) a table that keeps
   * playing pings again after this long, so it never looks idle mid-round. Well under the grace,
   * so a ping lost or delayed by a retry does not open the table to a resolve.
   */
  MATCH_PROGRESS_HEARTBEAT_MS: 3 * 60 * 1000,
  /** Lifetime of a match ticket; never beyond the match deadline. */
  TICKET_TTL_MS: 2 * 60 * 60 * 1000,
  /** Registration without a scheduled start closes (cancelled) after this long. */
  REGISTRATION_MAX_AGE_MS: 14 * 24 * 60 * 60 * 1000,
  /** A scheduled tournament that still lacks entrants this long after its start is cancelled. */
  UNSTARTED_GRACE_MS: 24 * 60 * 60 * 1000,
  /** Worker: after the first roster member joins, absent members become no-shows after this long. */
  NO_SHOW_GRACE_MS: 3 * 60 * 1000,
  /** Worker: countdown before a match starts once every roster member is seated. */
  AUTO_START_COUNTDOWN_MS: 10 * 1000,
  /** Inbox invites to register expire after this long. */
  INVITE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  /** Clients poll a tournament page this often while it is visible. */
  POLL_INTERVAL_MS: 5000,
} as const;

/**
 * Match points, normalized across table sizes: last place 0, first place MAX_POINTS + WIN_BONUS,
 * so a win at a table of three is worth as much as a win at a table of six.
 */
export const TOURNAMENT_POINTS = {
  MAX_POINTS: 10,
  WIN_BONUS: 2,
} as const;

/** Award XP tuning. One finished game is worth roughly 100 XP for comparison. */
export const TOURNAMENT_XP = {
  /** Every entrant beyond three adds this share to all award XP of the tournament. */
  FIELD_FACTOR_PER_ENTRANT: 0.05,
  FIELD_FACTOR_MAX: 2,
  /** The Oracle award needs at least this many bids over the tournament. */
  ORACLE_MIN_BIDS: 10,
} as const;

/** Per-user budgets of the tournament throttle (fixed windows). */
export const TOURNAMENT_RATE_LIMITS = {
  create: { limit: 5, windowSeconds: 60 * 60 },
  register: { limit: 30, windowSeconds: 10 * 60 },
  ticket: { limit: 60, windowSeconds: 10 * 60 },
  invite: { limit: 40, windowSeconds: 10 * 60 },
  /** Re-inviting the same player to the same tournament. */
  invite_pair: { limit: 1, windowSeconds: 60 * 60 },
} as const;

export type TournamentRateLimitedAction = keyof typeof TOURNAMENT_RATE_LIMITS;
