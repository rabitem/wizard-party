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

export class NotTrumpChooserError extends GameError {
  constructor() {
    super('Only the player deciding trump can select it', 'NOT_TRUMP_CHOOSER');
    this.name = 'NotTrumpChooserError';
  }
}

// ============================================================================
// Special Card Errors
// ============================================================================

/** A card was played without the choice it needs (Cloud/Juggler suit, Shapeshifter form). */
export class DeclarationRequiredError extends GameError {
  constructor(message: string) {
    super(message, 'DECLARATION_REQUIRED');
    this.name = 'DeclarationRequiredError';
  }
}

/** Card play attempted while a special-card effect waits for input. */
export class EffectPendingError extends GameError {
  constructor() {
    super('Resolve the special card effect first', 'EFFECT_PENDING');
    this.name = 'EffectPendingError';
  }
}

/** No special-card effect is waiting, or the response is not allowed. */
export class InvalidEffectResponseError extends GameError {
  constructor(message: string) {
    super(message, 'INVALID_EFFECT_RESPONSE');
    this.name = 'InvalidEffectResponseError';
  }
}

/** Trump selection named something that is not a suit. */
export class InvalidTrumpSuitError extends GameError {
  constructor(suit: unknown) {
    super(`Invalid trump suit: ${String(suit)}`, 'INVALID_TRUMP_SUIT');
    this.name = 'InvalidTrumpSuitError';
  }
}

/** "No trump" chosen where a suit is required. */
export class NoTrumpNotAllowedError extends GameError {
  constructor() {
    super('A trump suit must be chosen', 'NO_TRUMP_NOT_ALLOWED');
    this.name = 'NoTrumpNotAllowedError';
  }
}

// ============================================================================
// Game State Errors
// ============================================================================

/** A phase change the game's state machine does not allow. */
export class InvalidPhaseTransitionError extends GameError {
  constructor(from: string, to: string) {
    super(`Cannot move the game from ${from} to ${to}`, 'INVALID_PHASE_TRANSITION');
    this.name = 'InvalidPhaseTransitionError';
  }
}

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

export class PlayersReconnectingError extends GameError {
  constructor() {
    super('Cannot start while players are reconnecting', 'PLAYERS_RECONNECTING');
    this.name = 'PlayersReconnectingError';
  }
}

/** Moves wait while the table is paused for a disconnected player. */
export class GamePausedError extends GameError {
  constructor(waitingForName?: string) {
    super(
      waitingForName ? `Game is paused until ${waitingForName} reconnects` : 'Game is paused',
      'GAME_PAUSED'
    );
    this.name = 'GamePausedError';
  }
}

export class PlayerKickedError extends GameError {
  /** Shown to a kicked player; clients match on "removed from the table". */
  static readonly MESSAGE = 'You were removed from the table by the host';

  constructor() {
    super(PlayerKickedError.MESSAGE, 'PLAYER_KICKED');
    this.name = 'PlayerKickedError';
  }
}

export class CannotTargetSelfError extends GameError {
  constructor(action: string) {
    super(`You cannot ${action} yourself`, 'CANNOT_TARGET_SELF');
    this.name = 'CannotTargetSelfError';
  }
}

export class InvalidHostTargetError extends GameError {
  constructor() {
    super('The new host must be a connected player at the table', 'INVALID_HOST_TARGET');
    this.name = 'InvalidHostTargetError';
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
  /** `bid` is whatever arrived; anything but a whole number in range is invalid. */
  constructor(bid: unknown, maxBid: number) {
    super(`Invalid bid: ${String(bid)}. Must be a whole number between 0 and ${maxBid}`, 'INVALID_BID');
    this.name = 'InvalidBidError';
  }
}

export class BidAlreadyPlacedError extends GameError {
  constructor() {
    super('You have already bid this round', 'BID_ALREADY_PLACED');
    this.name = 'BidAlreadyPlacedError';
  }
}

export class ForbiddenBidError extends GameError {
  constructor(forbiddenBid: number, round: number) {
    super(`Cannot bid ${forbiddenBid} - total bids cannot equal ${round}`, 'FORBIDDEN_BID');
    this.name = 'ForbiddenBidError';
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
