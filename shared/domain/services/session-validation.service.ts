/**
 * Session Validation Service
 * Single responsibility: Validate session identifiers and reconnection eligibility
 */

export interface PersistentIdValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PauseState {
  pausedForPlayerId: string;
  pausedForPlayerName: string;
}

/**
 * Session validation domain service - stateless functions for session/connection validation
 */
export class SessionValidationService {
  /**
   * Expected format: player-{timestamp}-{random7chars}
   * Example: player-1706180000000-abc1234
   */
  private static readonly PERSISTENT_ID_PATTERN = /^player-\d+-[a-z0-9]{7}$/;

  /**
   * Session tokens are server-issued secrets: base64url of at least 32 random bytes. The same
   * alphabet doubles as a seat proof for the social presence check (see isSeatProof).
   */
  private static readonly SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

  /**
   * True for a value shaped like a session token. Shape only: whether it opens a seat is decided
   * by the room that issued it.
   */
  static isSessionToken(value: unknown): value is string {
    return typeof value === 'string' && this.SESSION_TOKEN_PATTERN.test(value);
  }

  /**
   * Constant-time comparison of two secrets, so the time a comparison takes does not reveal how
   * many leading characters of a guessed token were right.
   */
  static secretsMatch(expected: string, presented: string): boolean {
    if (expected.length !== presented.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected.charCodeAt(index) ^ presented.charCodeAt(index);
    }
    return difference === 0;
  }

  /**
   * Validate the format of a persistentId (malformed identifiers are refused).
   *
   * Only the shape is checked. The timestamp inside is the browser's clock when it first visited
   * and the browser keeps the id for good, so its age says nothing: a returning player whose id is
   * years old, or was made on a clock running ahead, must still get in. Seats are protected by the
   * session token, not by this id.
   */
  static validatePersistentId(persistentId: string): PersistentIdValidationResult {
    if (!persistentId) {
      return { isValid: false, error: 'Missing session identifier' };
    }

    if (typeof persistentId !== 'string') {
      return { isValid: false, error: 'Invalid session identifier type' };
    }

    if (!this.PERSISTENT_ID_PATTERN.test(persistentId)) {
      return { isValid: false, error: 'Invalid session identifier format' };
    }

    return { isValid: true };
  }

  /**
   * Check if a player can reconnect to a paused game
   * @param persistentId - The connecting player's persistent ID
   * @param pauseState - The current pause state of the game (null if not paused)
   * @param persistentIdToPlayerId - Mapping from persistent IDs to player IDs
   * @returns Object indicating if reconnection is allowed and reason if not
   */
  static canReconnectToPausedGame(
    persistentId: string,
    pauseState: PauseState | null,
    persistentIdToPlayerId: Map<string, string>
  ): { allowed: boolean; reason?: string; waitingForPlayer?: string } {
    // If game is not paused, anyone can join (subject to other validation)
    if (!pauseState) {
      return { allowed: true };
    }

    // Get the player ID for this persistent ID
    const playerId = persistentIdToPlayerId.get(persistentId);

    // If this persistent ID maps to the player we're waiting for, allow
    if (playerId === pauseState.pausedForPlayerId) {
      return { allowed: true };
    }

    // Otherwise, this is someone else trying to join while paused
    return {
      allowed: false,
      reason: `Game is paused waiting for ${pauseState.pausedForPlayerName} to reconnect`,
      waitingForPlayer: pauseState.pausedForPlayerName,
    };
  }

  /**
   * Check if a persistent ID was used recently (for idempotency)
   * @param persistentId - The ID to check
   * @param recentJoins - Map of persistent IDs to their last join timestamp
   * @param windowMs - Time window in milliseconds (default 2 seconds)
   * @returns true if this ID joined recently (within window)
   */
  static wasRecentlyJoined(
    persistentId: string,
    recentJoins: Map<string, number>,
    windowMs: number = 2000
  ): boolean {
    const lastJoinTime = recentJoins.get(persistentId);
    if (!lastJoinTime) return false;
    return Date.now() - lastJoinTime < windowMs;
  }

  /**
   * Generate a new valid persistent ID
   * Used by clients to create their session identifier
   */
  static generatePersistentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `player-${timestamp}-${random}`;
  }
}
