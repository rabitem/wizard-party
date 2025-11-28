/**
 * Base error class for all game-related errors
 */
export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'GameError';
  }
}

// ============================================================================
// Authorization Errors
// ============================================================================

export class NotHostError extends GameError {
  constructor(action: string) {
    super(`Only the host can ${action}`, 'NOT_HOST');
    this.name = 'NotHostError';
  }
}

export class NotYourTurnError extends GameError {
  constructor(action: string) {
    super(`Not your turn to ${action}`, 'NOT_YOUR_TURN');
    this.name = 'NotYourTurnError';
  }
}

export class NotDealerError extends GameError {
  constructor() {
    super('Only the dealer can select trump', 'NOT_DEALER');
    this.name = 'NotDealerError';
  }
}

// ============================================================================
// Game State Errors
// ============================================================================

export class InvalidPhaseError extends GameError {
  constructor(expectedPhase: string, currentPhase: string) {
    super(`Cannot perform this action. Expected phase: ${expectedPhase}, current: ${currentPhase}`, 'INVALID_PHASE');
    this.name = 'InvalidPhaseError';
  }
}

export class GameNotStartedError extends GameError {
  constructor() {
    super('Game has not started yet', 'GAME_NOT_STARTED');
    this.name = 'GameNotStartedError';
  }
}

export class GameAlreadyStartedError extends GameError {
  constructor() {
    super('Game has already started', 'GAME_ALREADY_STARTED');
    this.name = 'GameAlreadyStartedError';
  }
}

export class GameNotFoundError extends GameError {
  constructor(gameId: string) {
    super(`Game not found: ${gameId}`, 'GAME_NOT_FOUND');
    this.name = 'GameNotFoundError';
  }
}

// ============================================================================
// Player Errors
// ============================================================================

export class PlayerNotFoundError extends GameError {
  constructor(playerId: string) {
    super(`Player not found: ${playerId}`, 'PLAYER_NOT_FOUND');
    this.name = 'PlayerNotFoundError';
  }
}

export class PlayerAlreadyInGameError extends GameError {
  constructor(playerId: string) {
    super(`Player already in game: ${playerId}`, 'PLAYER_ALREADY_IN_GAME');
    this.name = 'PlayerAlreadyInGameError';
  }
}

export class MaxPlayersReachedError extends GameError {
  constructor(maxPlayers: number) {
    super(`Maximum ${maxPlayers} players allowed`, 'MAX_PLAYERS_REACHED');
    this.name = 'MaxPlayersReachedError';
  }
}

export class NotEnoughPlayersError extends GameError {
  constructor(minPlayers: number, currentPlayers: number) {
    super(`Need at least ${minPlayers} players to start (currently ${currentPlayers})`, 'NOT_ENOUGH_PLAYERS');
    this.name = 'NotEnoughPlayersError';
  }
}

// ============================================================================
// Card Errors
// ============================================================================

export class CardNotFoundError extends GameError {
  constructor(cardId: string) {
    super(`Card not found: ${cardId}`, 'CARD_NOT_FOUND');
    this.name = 'CardNotFoundError';
  }
}

export class CardNotPlayableError extends GameError {
  constructor(cardId: string) {
    super(`Cannot play card ${cardId} - must follow suit`, 'CARD_NOT_PLAYABLE');
    this.name = 'CardNotPlayableError';
  }
}

export class InvalidCardValueError extends GameError {
  constructor(value: number) {
    super(`Invalid card value: ${value}. Must be between 1 and 13`, 'INVALID_CARD_VALUE');
    this.name = 'InvalidCardValueError';
  }
}

// ============================================================================
// Bidding Errors
// ============================================================================

export class InvalidBidError extends GameError {
  constructor(bid: number, maxBid: number) {
    super(`Invalid bid: ${bid}. Must be between 0 and ${maxBid}`, 'INVALID_BID');
    this.name = 'InvalidBidError';
  }
}

export class ForbiddenBidError extends GameError {
  constructor(forbiddenBid: number, round: number) {
    super(`Cannot bid ${forbiddenBid} - total bids cannot equal ${round}`, 'FORBIDDEN_BID');
    this.name = 'ForbiddenBidError';
  }
}

// ============================================================================
// Undo Errors
// ============================================================================

export class UndoNotAvailableError extends GameError {
  constructor() {
    super('No card to undo', 'UNDO_NOT_AVAILABLE');
    this.name = 'UndoNotAvailableError';
  }
}

export class UndoAlreadyPendingError extends GameError {
  constructor() {
    super('An undo request is already pending', 'UNDO_ALREADY_PENDING');
    this.name = 'UndoAlreadyPendingError';
  }
}

export class NoActiveUndoRequestError extends GameError {
  constructor() {
    super('No active undo request', 'NO_ACTIVE_UNDO_REQUEST');
    this.name = 'NoActiveUndoRequestError';
  }
}

// ============================================================================
// Room Errors
// ============================================================================

export class RoomFullError extends GameError {
  constructor() {
    super('Room is full', 'ROOM_FULL');
    this.name = 'RoomFullError';
  }
}

export class InvalidRoomPasswordError extends GameError {
  constructor() {
    super('Invalid room password', 'INVALID_ROOM_PASSWORD');
    this.name = 'InvalidRoomPasswordError';
  }
}
