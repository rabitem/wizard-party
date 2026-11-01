/**
 * Server-side protocol bookkeeping limits (see docs/server/protocol.md).
 */

/** Idempotency log of applied commands (see ProcessedCommandLog). */
export const PROCESSED_COMMAND_LIMITS = {
  /** How long a requestId is remembered; a client resends within seconds of reconnecting. */
  WINDOW_MS: 5 * 60 * 1000,
  /**
   * RequestIds kept per seat. Far above what a player sends in the window (the game's own pace
   * and the command budgets bound it), and it keeps the persisted log small.
   */
  MAX_PER_SEAT: 200,
} as const;
