import { IGameState, ICard } from '../entities';
import { Suit } from '../value-objects/card-types';

/**
 * Event types for server-to-client communication
 */
export enum GameEventType {
  // Connection events
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_RECONNECTED = 'PLAYER_RECONNECTED',

  // Game flow events
  GAME_STARTED = 'GAME_STARTED',
  ROUND_STARTED = 'ROUND_STARTED',
  TRUMP_REVEALED = 'TRUMP_REVEALED',
  TRUMP_SELECTED = 'TRUMP_SELECTED',

  // Bidding events
  BID_PLACED = 'BID_PLACED',
  BIDDING_COMPLETE = 'BIDDING_COMPLETE',

  // Playing events
  CARD_PLAYED = 'CARD_PLAYED',
  TRICK_COMPLETE = 'TRICK_COMPLETE',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  GAME_COMPLETE = 'GAME_COMPLETE',

  // Pause events
  GAME_PAUSED = 'GAME_PAUSED',
  GAME_RESUMED = 'GAME_RESUMED',

  // State sync
  GAME_STATE = 'GAME_STATE',
  ERROR = 'ERROR',

  // Social events
  EMOTE = 'EMOTE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',

  // Rematch events
  REMATCH_REQUESTED = 'REMATCH_REQUESTED',
  REMATCH_STARTED = 'REMATCH_STARTED',

  // Undo events
  UNDO_REQUESTED = 'UNDO_REQUESTED',
  UNDO_RESPONSE = 'UNDO_RESPONSE',
  UNDO_APPLIED = 'UNDO_APPLIED',
  UNDO_CANCELLED = 'UNDO_CANCELLED',
}

/**
 * Base interface for all game events
 */
export interface BaseGameEvent {
  type: GameEventType;
  timestamp: number;
}

// ============================================================================
// Connection Events
// ============================================================================

export interface PlayerJoinedEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_JOINED;
  playerId: string;
  playerName: string;
  isBot?: boolean;
}

export interface PlayerLeftEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_LEFT;
  playerId: string;
}

export interface PlayerReconnectedEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_RECONNECTED;
  playerId: string;
  playerName: string;
}

// ============================================================================
// Game Flow Events
// ============================================================================

export interface GameStartedEvent extends BaseGameEvent {
  type: GameEventType.GAME_STARTED;
  state: IGameState;
}

export interface RoundStartedEvent extends BaseGameEvent {
  type: GameEventType.ROUND_STARTED;
  round: number;
  dealerId: string;
}

export interface TrumpRevealedEvent extends BaseGameEvent {
  type: GameEventType.TRUMP_REVEALED;
  trumpCard: ICard | null;
  trumpSuit: Suit | null;
  dealerMustChoose: boolean;
}

export interface TrumpSelectedEvent extends BaseGameEvent {
  type: GameEventType.TRUMP_SELECTED;
  trumpSuit: Suit;
}

// ============================================================================
// Bidding Events
// ============================================================================

export interface BidPlacedEvent extends BaseGameEvent {
  type: GameEventType.BID_PLACED;
  playerId: string;
  bid: number;
  nextPlayerId: string | null;
}

export interface BiddingCompleteEvent extends BaseGameEvent {
  type: GameEventType.BIDDING_COMPLETE;
  firstPlayerId: string;
}

// ============================================================================
// Playing Events
// ============================================================================

export interface CardPlayedEvent extends BaseGameEvent {
  type: GameEventType.CARD_PLAYED;
  playerId: string;
  card: ICard;
  nextPlayerId: string | null;
}

export interface TrickCompleteEvent extends BaseGameEvent {
  type: GameEventType.TRICK_COMPLETE;
  winnerId: string;
  trickIndex: number;
  trickCards: { playerId: string; card: ICard }[];
}

export interface RoundCompleteEvent extends BaseGameEvent {
  type: GameEventType.ROUND_COMPLETE;
  scores: { playerId: string; roundScore: number; totalScore: number }[];
}

export interface GameCompleteEvent extends BaseGameEvent {
  type: GameEventType.GAME_COMPLETE;
  winnerId: string;
  finalScores: { playerId: string; score: number }[];
}

// ============================================================================
// Pause Events
// ============================================================================

export interface GamePausedEvent extends BaseGameEvent {
  type: GameEventType.GAME_PAUSED;
  pausedForPlayerId: string;
  pausedForPlayerName: string;
  timeoutDuration: number;
  reason: 'player_left' | 'player_disconnected';
}

export interface GameResumedEvent extends BaseGameEvent {
  type: GameEventType.GAME_RESUMED;
  resumedPlayerId: string;
  resumedPlayerName: string;
}

// ============================================================================
// State Sync Events
// ============================================================================

export interface GameStateEvent extends BaseGameEvent {
  type: GameEventType.GAME_STATE;
  state: IGameState;
  yourPlayerId: string;
}

export interface ErrorEvent extends BaseGameEvent {
  type: GameEventType.ERROR;
  message: string;
}

// ============================================================================
// Social Events
// ============================================================================

export interface EmoteEvent extends BaseGameEvent {
  type: GameEventType.EMOTE;
  playerId: string;
  playerName: string;
  emoteId: string;
}

export interface ChatMessageEvent extends BaseGameEvent {
  type: GameEventType.CHAT_MESSAGE;
  playerId: string;
  playerName: string;
  message: string;
}

// ============================================================================
// Rematch Events
// ============================================================================

export interface RematchRequestedEvent extends BaseGameEvent {
  type: GameEventType.REMATCH_REQUESTED;
  playerId: string;
}

export interface RematchStartedEvent extends BaseGameEvent {
  type: GameEventType.REMATCH_STARTED;
}

// ============================================================================
// Undo Events
// ============================================================================

export interface UndoRequestedEvent extends BaseGameEvent {
  type: GameEventType.UNDO_REQUESTED;
  requesterId: string;
  requesterName: string;
  cardId: string;
  cardDescription: string;
  requiredApprovals: number;
}

export interface UndoResponseEvent extends BaseGameEvent {
  type: GameEventType.UNDO_RESPONSE;
  responderId: string;
  responderName: string;
  approved: boolean;
}

export interface UndoAppliedEvent extends BaseGameEvent {
  type: GameEventType.UNDO_APPLIED;
}

export interface UndoCancelledEvent extends BaseGameEvent {
  type: GameEventType.UNDO_CANCELLED;
  reason: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type GameEvent =
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PlayerReconnectedEvent
  | GameStartedEvent
  | RoundStartedEvent
  | TrumpRevealedEvent
  | TrumpSelectedEvent
  | BidPlacedEvent
  | BiddingCompleteEvent
  | CardPlayedEvent
  | TrickCompleteEvent
  | RoundCompleteEvent
  | GameCompleteEvent
  | GamePausedEvent
  | GameResumedEvent
  | GameStateEvent
  | ErrorEvent
  | EmoteEvent
  | ChatMessageEvent
  | RematchRequestedEvent
  | RematchStartedEvent
  | UndoRequestedEvent
  | UndoResponseEvent
  | UndoAppliedEvent
  | UndoCancelledEvent;
