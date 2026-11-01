/**
 * Limits and tuning values for the player account domain.
 * Shared by client and server so both validate against the same numbers.
 */
export const ACCOUNT_LIMITS = {
  TAGLINE_MAX_LENGTH: 80,
  /** Rounds in a single game (60 cards / 3 players). */
  MAX_ROUNDS_PER_GAME: 20,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  /** Upper bound for a single sync request. */
  MAX_RESULTS_PER_BATCH: 50,
  /** Recent games returned in the account overview. */
  RECENT_GAMES: 20,
  /** Games a player can pin to their profile. */
  MAX_PINNED_GAMES: 6,
  /** Default page size of the full game history. */
  HISTORY_PAGE_SIZE: 20,
  /** Largest page a client may request from the game history. */
  MAX_HISTORY_PAGE_SIZE: 50,
  /** Stored custom sounds per account. */
  MAX_CUSTOM_SOUNDS: 24,
  /** Serialized size limit of one synced settings document. */
  MAX_DOCUMENT_BYTES: 32 * 1024,
  /** Results played further in the future than this are rejected (clock skew allowance). */
  MAX_CLOCK_SKEW_MS: 10 * 60 * 1000,
} as const;

/** Experience awarded per game. Tuned so a typical win is worth ~3 losses. */
export const XP_RULES = {
  PER_GAME: 40,
  PER_CORRECT_BID: 8,
  /** Win bonus; 2nd place gets half, others nothing. Scaled by table size. */
  WIN_BONUS: 60,
  PER_EXTRA_OPPONENT: 0.15,
} as const;
