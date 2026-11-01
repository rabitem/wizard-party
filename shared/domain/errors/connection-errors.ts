/**
 * Connection-related errors for lobby and game joining
 * These errors handle validation failures during player connection and reconnection
 */

import { GameError } from './game-errors';

// ============================================================================
// Player Name Errors
// ============================================================================

/**
 * Thrown when a player tries to join with a name that's already taken in the game
 */
export class PlayerNameTakenError extends GameError {
  constructor(name: string) {
    super(`The name "${name}" is already taken in this game`, 'PLAYER_NAME_TAKEN');
    this.name = 'PlayerNameTakenError';
  }
}

/**
 * Thrown when a player name fails validation (empty, too short/long, invalid chars)
 */
export class InvalidPlayerNameError extends GameError {
  constructor(reason: string) {
    super(`Invalid player name: ${reason}`, 'INVALID_PLAYER_NAME');
    this.name = 'InvalidPlayerNameError';
  }
}

// ============================================================================
// Session Errors
// ============================================================================

/**
 * Thrown when the persistentId format is invalid or missing
 */
export class InvalidPersistentIdError extends GameError {
  constructor() {
    super('Invalid session identifier', 'INVALID_PERSISTENT_ID');
    this.name = 'InvalidPersistentIdError';
  }
}

/**
 * Thrown when a session has expired and the player needs to rejoin fresh
 */
export class SessionExpiredError extends GameError {
  constructor() {
    super('Your session has expired. Please rejoin the game.', 'SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Thrown when a join names a seat that is protected by a session token the caller did not present
 * (for example a stolen or guessed persistent id). The seat stays with its owner.
 */
export class SessionRejectedError extends GameError {
  static readonly MESSAGE = 'This seat belongs to another session. Rejoin from the device you played on.';

  constructor() {
    super(SessionRejectedError.MESSAGE, 'SESSION_REJECTED');
    this.name = 'SessionRejectedError';
  }
}

// ============================================================================
// Reconnection Errors
// ============================================================================

/**
 * Thrown when trying to join a game that's paused waiting for a different player
 */
export class ReconnectionSlotTakenError extends GameError {
  constructor(playerName: string) {
    super(`Game is paused waiting for ${playerName} to reconnect`, 'RECONNECTION_SLOT_TAKEN');
    this.name = 'ReconnectionSlotTakenError';
  }
}

/**
 * Thrown when a player tries to reconnect but the game state doesn't allow it
 */
export class ReconnectionNotAllowedError extends GameError {
  constructor(reason: string) {
    super(`Cannot reconnect: ${reason}`, 'RECONNECTION_NOT_ALLOWED');
    this.name = 'ReconnectionNotAllowedError';
  }
}

// ============================================================================
// Idempotency Errors
// ============================================================================

/**
 * Thrown when detecting a duplicate join request that's already being processed
 */
export class DuplicateJoinError extends GameError {
  constructor() {
    super('Already processing your join request', 'DUPLICATE_JOIN');
    this.name = 'DuplicateJoinError';
  }
}
