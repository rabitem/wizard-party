import { Suit } from '../value-objects/card-types';
import { IRoomSettings } from '../entities/game';

/**
 * Command types for client-to-server communication
 */
export enum ClientCommandType {
  // Game management
  JOIN_GAME = 'JOIN_GAME',
  LEAVE_GAME = 'LEAVE_GAME',
  START_GAME = 'START_GAME',
  REQUEST_STATE = 'REQUEST_STATE',
  SET_ROOM_SETTINGS = 'SET_ROOM_SETTINGS',

  // Game actions
  SELECT_TRUMP = 'SELECT_TRUMP',
  PLACE_BID = 'PLACE_BID',
  PLAY_CARD = 'PLAY_CARD',
  NEXT_ROUND = 'NEXT_ROUND',

  // Social
  SEND_EMOTE = 'SEND_EMOTE',
  SEND_CHAT = 'SEND_CHAT',

  // Rematch
  REQUEST_REMATCH = 'REQUEST_REMATCH',

  // Undo
  REQUEST_UNDO = 'REQUEST_UNDO',
  RESPOND_UNDO = 'RESPOND_UNDO',

  // Bots
  ADD_BOT = 'ADD_BOT',
  REMOVE_BOT = 'REMOVE_BOT',
}

/**
 * Base interface for all client commands
 */
export interface BaseCommand {
  type: ClientCommandType;
}

// ============================================================================
// Game Management Commands
// ============================================================================

export interface JoinGameCommand extends BaseCommand {
  type: ClientCommandType.JOIN_GAME;
  playerName: string;
  persistentId?: string;
  roomSettings?: IRoomSettings;
}

export interface LeaveGameCommand extends BaseCommand {
  type: ClientCommandType.LEAVE_GAME;
}

export interface StartGameCommand extends BaseCommand {
  type: ClientCommandType.START_GAME;
}

export interface RequestStateCommand extends BaseCommand {
  type: ClientCommandType.REQUEST_STATE;
}

export interface SetRoomSettingsCommand extends BaseCommand {
  type: ClientCommandType.SET_ROOM_SETTINGS;
  roomSettings: IRoomSettings;
}

// ============================================================================
// Game Action Commands
// ============================================================================

export interface SelectTrumpCommand extends BaseCommand {
  type: ClientCommandType.SELECT_TRUMP;
  suit: Suit;
}

export interface PlaceBidCommand extends BaseCommand {
  type: ClientCommandType.PLACE_BID;
  bid: number;
}

export interface PlayCardCommand extends BaseCommand {
  type: ClientCommandType.PLAY_CARD;
  cardId: string;
}

export interface NextRoundCommand extends BaseCommand {
  type: ClientCommandType.NEXT_ROUND;
}

// ============================================================================
// Social Commands
// ============================================================================

export interface SendEmoteCommand extends BaseCommand {
  type: ClientCommandType.SEND_EMOTE;
  emoteId: string;
}

export interface SendChatCommand extends BaseCommand {
  type: ClientCommandType.SEND_CHAT;
  message: string;
}

// ============================================================================
// Rematch Commands
// ============================================================================

export interface RequestRematchCommand extends BaseCommand {
  type: ClientCommandType.REQUEST_REMATCH;
}

// ============================================================================
// Undo Commands
// ============================================================================

export interface RequestUndoCommand extends BaseCommand {
  type: ClientCommandType.REQUEST_UNDO;
}

export interface RespondUndoCommand extends BaseCommand {
  type: ClientCommandType.RESPOND_UNDO;
  approved: boolean;
}

// ============================================================================
// Bot Commands
// ============================================================================

export interface AddBotCommand extends BaseCommand {
  type: ClientCommandType.ADD_BOT;
}

export interface RemoveBotCommand extends BaseCommand {
  type: ClientCommandType.REMOVE_BOT;
  botId: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type ClientCommand =
  | JoinGameCommand
  | LeaveGameCommand
  | StartGameCommand
  | RequestStateCommand
  | SetRoomSettingsCommand
  | SelectTrumpCommand
  | PlaceBidCommand
  | PlayCardCommand
  | NextRoundCommand
  | SendEmoteCommand
  | SendChatCommand
  | RequestRematchCommand
  | RequestUndoCommand
  | RespondUndoCommand
  | AddBotCommand
  | RemoveBotCommand;
