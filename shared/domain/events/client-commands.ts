import { Suit } from '../value-objects/card-types';
import type { ICardDeclaration } from '../expansions/card-behavior';
import type { TrickEffectResponse } from '../expansions/trick-effects';
import { IRoomSettings } from '../entities/game';
import { IRulesetConfig } from '../value-objects/ruleset-config';
import type { CustomSound, CustomTrickWinAudio, SoundboardSoundName } from '../constants/sound-options';

/**
 * Command types for client-to-server communication
 */
export enum ClientCommandType {
  // Game management
  JOIN_GAME = 'JOIN_GAME',
  LEAVE_GAME = 'LEAVE_GAME',
  START_GAME = 'START_GAME',
  REQUEST_STATE = 'REQUEST_STATE',
  /** Liveness probe; answered with PONG, also on a connection whose join failed. */
  PING = 'PING',
  SET_ROOM_SETTINGS = 'SET_ROOM_SETTINGS',
  SET_RULESET = 'SET_RULESET',

  // Lobby management
  SET_READY = 'SET_READY',
  KICK_PLAYER = 'KICK_PLAYER',
  TRANSFER_HOST = 'TRANSFER_HOST',

  // Game actions
  SELECT_TRUMP = 'SELECT_TRUMP',
  PLACE_BID = 'PLACE_BID',
  PLAY_CARD = 'PLAY_CARD',
  RESOLVE_EFFECT = 'RESOLVE_EFFECT',
  NEXT_ROUND = 'NEXT_ROUND',

  // Social
  SEND_EMOTE = 'SEND_EMOTE',
  SEND_CHAT = 'SEND_CHAT',
  // Muting is the client's own filter. MUTE_PLAYER / UNMUTE_PLAYER were retired: the server
  // refuses them as unknown commands.

  // Rematch
  REQUEST_REMATCH = 'REQUEST_REMATCH',

  // Bots
  ADD_BOT = 'ADD_BOT',
  REMOVE_BOT = 'REMOVE_BOT',

  // Sound Preferences
  UPDATE_SOUND_PREFERENCES = 'UPDATE_SOUND_PREFERENCES',
  PLAY_TIMEOUT_SOUND = 'PLAY_TIMEOUT_SOUND',
}

/**
 * Base interface for all client commands
 */
export interface BaseCommand {
  type: ClientCommandType;
  /** Client-generated idempotency key for retry-safe command handling. */
  requestId?: string;
}

// ============================================================================
// Game Management Commands
// ============================================================================

export interface JoinGameCommand extends BaseCommand {
  type: ClientCommandType.JOIN_GAME;
  playerName: string;
  /**
   * The browser's stable id. It keys kick bans and join de-duplication; only a seat created by a
   * legacy (version 1) client uses it as its id and credential.
   */
  persistentId?: string;
  /** The secret the server issued for this room's seat (SESSION message); resumes that seat. */
  sessionToken?: string;
  /** The protocol the client speaks (see PROTOCOL_VERSION); absent means the legacy protocol 1. */
  protocolVersion?: number;
  roomSettings?: IRoomSettings;
  /**
   * Signed match ticket ('v1.<payload>.<signature>', see shared/tournament) issued by the server
   * for a tournament table. Required for tournament room codes; the worker verifies it and seats
   * the player by account instead of trusting playerName.
   */
  tournamentTicket?: string;
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

/** Liveness probe: the server answers PONG without sending a snapshot. */
export interface PingCommand extends BaseCommand {
  type: ClientCommandType.PING;
}

export interface SetRoomSettingsCommand extends BaseCommand {
  type: ClientCommandType.SET_ROOM_SETTINGS;
  roomSettings: IRoomSettings;
}

export interface SetRulesetCommand extends BaseCommand {
  type: ClientCommandType.SET_RULESET;
  rulesetConfig: IRulesetConfig;
}

// ============================================================================
// Lobby Management Commands
// ============================================================================

/** Any human player in the lobby toggles their own ready flag. */
export interface SetReadyCommand extends BaseCommand {
  type: ClientCommandType.SET_READY;
  ready: boolean;
}

/** Host-only, lobby-only: removes a player and blocks them from rejoining the lobby. */
export interface KickPlayerCommand extends BaseCommand {
  type: ClientCommandType.KICK_PLAYER;
  playerId: string;
}

/** Host-only, lobby-only: hands the host role to another connected human player. */
export interface TransferHostCommand extends BaseCommand {
  type: ClientCommandType.TRANSFER_HOST;
  playerId: string;
}

// ============================================================================
// Game Action Commands
// ============================================================================

export interface SelectTrumpCommand extends BaseCommand {
  type: ClientCommandType.SELECT_TRUMP;
  /** Null declares no trump (only allowed for the Werewolf holder). */
  suit: Suit | null;
}

export interface PlaceBidCommand extends BaseCommand {
  type: ClientCommandType.PLACE_BID;
  bid: number;
}

/**
 * Physics state sent by the client when playing a card
 */
export interface ClientPhysicsState {
  /** Velocity at the moment of throw (world units per second) */
  throwVelocity: { x: number; y: number; z: number };
  /** Target landing position on the table */
  landingPosition: { x: number; y: number; z: number };
  /** Starting position of the throw */
  startPosition: { x: number; y: number; z: number };
}

export interface PlayCardCommand extends BaseCommand {
  type: ClientCommandType.PLAY_CARD;
  cardId: string;
  /** Choice for cards that need one (Cloud/Juggler suit, Shapeshifter form). */
  declaration?: ICardDeclaration;
  soundChoice?: string; // Sound to play when card lands (synchronized across all clients)
  customAudio?: CustomSound; // Uploaded wizard/jester sound to play when the card lands
  /** Physics state for the card throw - enables synchronized physics across all clients */
  physicsState?: ClientPhysicsState;
}

/** Answer to the pending special-card effect (Juggler pass, Cloud bid change, Witch swap). */
export interface ResolveEffectCommand extends BaseCommand {
  type: ClientCommandType.RESOLVE_EFFECT;
  response: TrickEffectResponse;
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
// Bot Commands
// ============================================================================

export interface AddBotCommand extends BaseCommand {
  type: ClientCommandType.ADD_BOT;
  difficulty?: 1 | 2 | 3 | 4 | 5; // 1=Novice, 2=Easy, 3=Medium, 4=Hard, 5=Expert
}

export interface RemoveBotCommand extends BaseCommand {
  type: ClientCommandType.REMOVE_BOT;
  botId: string;
}

// ============================================================================
// Sound Preferences Commands
// ============================================================================

export interface SoundPreferences {
  trickWinSound?: string; // Trick win sound preference
  customTrickWinAudio?: CustomTrickWinAudio | null; // Uploaded trick win sound, null removes it
  customTrickWinAudios?: CustomSound[] | null; // Uploaded trick win sound pool, null removes it
  sharedCustomSounds?: CustomSound[] | null; // Uploaded sounds shared with the party, null removes them
}

export interface UpdateSoundPreferencesCommand extends BaseCommand {
  type: ClientCommandType.UPDATE_SOUND_PREFERENCES;
  preferences: SoundPreferences;
}

export interface PlayTimeoutSoundCommand extends BaseCommand {
  type: ClientCommandType.PLAY_TIMEOUT_SOUND;
  soundName?: SoundboardSoundName;
  customAudio?: CustomSound;
}

// ============================================================================
// Full Union Type
// ============================================================================

export type ClientCommand =
  | JoinGameCommand
  | LeaveGameCommand
  | StartGameCommand
  | RequestStateCommand
  | PingCommand
  | SetRoomSettingsCommand
  | SetRulesetCommand
  | SetReadyCommand
  | KickPlayerCommand
  | TransferHostCommand
  | SelectTrumpCommand
  | PlaceBidCommand
  | PlayCardCommand
  | ResolveEffectCommand
  | NextRoundCommand
  | SendEmoteCommand
  | SendChatCommand
  | RequestRematchCommand
  | AddBotCommand
  | RemoveBotCommand
  | UpdateSoundPreferencesCommand
  | PlayTimeoutSoundCommand;
