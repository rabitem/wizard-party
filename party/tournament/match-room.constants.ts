/**
 * Worker-side settings of tournament match rooms. Timings shared with the server and the UI
 * (no-show grace, auto-start countdown) live in TOURNAMENT_TIMING of the domain.
 */

/** Durable Object storage key of the match lock (next to the game's 'gameState'). */
export const TOURNAMENT_MATCH_STORAGE_KEY = 'tournamentMatch';

export const TOURNAMENT_MATCH_RECORD_VERSION = 1;

export const TOURNAMENT_ROOM_TIMING = {
  /** A finished round moves on by itself after this long, so an idle host can't stall a match. */
  ROUND_END_AUTO_ADVANCE_MS: 30_000,
  /** Sooner when the host seat is played by a bot or its player is disconnected. */
  HOSTLESS_ROUND_END_ADVANCE_MS: 5_000,
  /** A start or advance that failed is tried again after this long (never in a tight alarm loop). */
  FAILED_ALARM_RETRY_MS: 15_000,
} as const;

export const TOURNAMENT_ROOM_LIMITS = {
  /**
   * Messages a socket may send while its JOIN_GAME ticket is verified; they are handled once the
   * join settled (a reconnecting client flushes its queued moves right after the JOIN).
   */
  MAX_HELD_MESSAGES_PER_JOIN: 64,
} as const;

/** Storage layout and pacing of the durable result outbox. */
export const MATCH_RESULT_OUTBOX = {
  PENDING_PREFIX: 'tournament:results:pending:',
  DEAD_LETTER_PREFIX: 'tournament:results:dead:',
  /** At most one progress ping per match waits here; a newer ping replaces it, the result removes it. */
  PROGRESS_PREFIX: 'tournament:progress:pending:',
  /** Reports delivered per drain pass (a room produces one report; the bound is a safety net). */
  BATCH_LIMIT: 16,
  /** Re-armed alarm in case the object is evicted before the immediate flush ran. */
  SAFETY_NET_MS: 60_000,
} as const;
