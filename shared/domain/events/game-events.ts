import type { IGameState, ICard } from '../entities';
import { Suit } from '../value-objects/card-types';
import type { ICardDeclaration } from '../expansions/card-behavior';
import type { TrickEffectOutcome } from '../expansions/trick-effects';
import type { IStanding } from '../services/standings.service';
import type { CustomSound, CustomTrickWinAudio, SharedCustomSound, SoundboardSoundName } from '../constants/sound-options';
import type { TournamentMatchRoomState } from '../tournament/match-room';

/**
 * Event types for server-to-client communication
 */
export enum GameEventType {
  // Connection events
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_RECONNECTED = 'PLAYER_RECONNECTED',

  // Lobby management events
  PLAYER_KICKED = 'PLAYER_KICKED',
  HOST_CHANGED = 'HOST_CHANGED',

  // Lobby grace period events
  PLAYER_GRACED = 'PLAYER_GRACED',
  PLAYER_GRACE_EXPIRED = 'PLAYER_GRACE_EXPIRED',
  PLAYER_GRACE_RESTORED = 'PLAYER_GRACE_RESTORED',

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
  TRICK_EFFECT_RESOLVED = 'TRICK_EFFECT_RESOLVED',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  GAME_COMPLETE = 'GAME_COMPLETE',
  TURN_TIMER_EXPIRED = 'TURN_TIMER_EXPIRED',
  TIMEOUT_SOUND_PLAYED = 'TIMEOUT_SOUND_PLAYED',

  // Pause events
  GAME_PAUSED = 'GAME_PAUSED',
  GAME_RESUMED = 'GAME_RESUMED',

  // State sync
  GAME_STATE = 'GAME_STATE',
  ERROR = 'ERROR',

  // Protocol (sent to one connection only)
  /** The seat this connection holds and its secret session token. */
  SESSION = 'SESSION',
  /** Answer to PING. */
  PONG = 'PONG',
  /** A state-changing command of this connection was applied (or had already been applied). */
  COMMAND_ACK = 'COMMAND_ACK',

  // Shared custom sounds (sent on join and whenever the room's set changes)
  SHARED_SOUNDS = 'SHARED_SOUNDS',

  // Social events
  EMOTE = 'EMOTE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',

  // Rematch events
  REMATCH_REQUESTED = 'REMATCH_REQUESTED',
  REMATCH_STARTED = 'REMATCH_STARTED',
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
// Lobby Management Events
// ============================================================================

/** The host removed a player from the lobby. Sent to everyone, including the removed player. */
export interface PlayerKickedEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_KICKED;
  playerId: string;
  playerName: string;
}

/** The host role moved to another player (explicit transfer or automatic hand-over). */
export interface HostChangedEvent extends BaseGameEvent {
  type: GameEventType.HOST_CHANGED;
  hostId: string;
}

// ============================================================================
// Lobby Grace Period Events
// ============================================================================

/**
 * Emitted when a player disconnects in lobby and enters grace period
 * They remain in the player list but are marked as disconnected
 */
export interface PlayerGracedEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_GRACED;
  playerId: string;
  playerName: string;
  graceDuration: number;
  wasHost: boolean;
}

/**
 * Emitted when a player's grace period expires and they are removed
 */
export interface PlayerGraceExpiredEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_GRACE_EXPIRED;
  playerId: string;
  playerName: string;
  /** New host ID if host was transferred */
  newHostId?: string;
}

/**
 * Emitted when a player reconnects during their grace period
 */
export interface PlayerGraceRestoredEvent extends BaseGameEvent {
  type: GameEventType.PLAYER_GRACE_RESTORED;
  playerId: string;
  playerName: string;
  /** True if this player regained host status */
  isHost: boolean;
}

// ============================================================================
// Game Flow Events
// ============================================================================

/**
 * The game left the lobby. Public facts only: every player's own view of the dealt round arrives in
 * the personalized GAME_STATE that follows.
 */
export interface GameStartedEvent extends BaseGameEvent {
  type: GameEventType.GAME_STARTED;
  playerIds: string[];
  dealerId: string | null;
  maxRounds: number;
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
  /** Player deciding trump (dealer, or the Werewolf holder); null when trump is fixed. */
  trumpChooserId?: string | null;
}

export interface TrumpSelectedEvent extends BaseGameEvent {
  type: GameEventType.TRUMP_SELECTED;
  /** Null when the Werewolf holder declared no trump. */
  trumpSuit: Suit | null;
  /** The player who chose (dealer, or the Werewolf holder). */
  playerId?: string;
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
// Physics State for Multiplayer Sync
// ============================================================================

/**
 * 3D vector for physics calculations
 */
export interface PhysicsVector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Physics state for card animations - enables synchronized physics across all clients
 */
export interface CardPhysicsState {
  /** Velocity at the moment of throw (world units per second) */
  throwVelocity: PhysicsVector3;
  /** Target landing position on the table */
  landingPosition: PhysicsVector3;
  /** Starting position of the throw */
  startPosition: PhysicsVector3;
  /** Seeded random seed for consistent per-card variation across all clients */
  physicsSeed: number;
}

// ============================================================================
// Playing Events
// ============================================================================

export interface CardPlayedEvent extends BaseGameEvent {
  type: GameEventType.CARD_PLAYED;
  playerId: string;
  card: ICard;
  /** Choice announced with the card (Cloud/Juggler suit, Shapeshifter form). */
  declaration?: ICardDeclaration;
  nextPlayerId: string | null;
  soundChoice?: string; // Sound all clients should play when card lands
  customAudio?: CustomSound; // Uploaded wizard/jester sound all clients should play when card lands
  /** Physics state for synchronized card animation across all clients */
  physicsState?: CardPhysicsState;
}

export interface TrickCompleteEvent extends BaseGameEvent {
  type: GameEventType.TRICK_COMPLETE;
  /**
   * Player the trick goes to: the winner, or for a Bomb-voided trick the player
   * who leads next (the trick then counts for nobody, see `voided`).
   */
  winnerId: string;
  /** True when a Bomb destroyed the trick: nobody is credited with it. */
  voided?: boolean;
  trickIndex: number;
  trickCards: { playerId: string; card: ICard }[];
  soundChoice?: string; // Winner's trick win sound preference
  customTrickWinAudio?: CustomTrickWinAudio; // Winner's uploaded trick win audio, if configured
}

/** A special-card effect after a trick was resolved (Juggler pass, Cloud bid change, Witch swap). */
export interface TrickEffectResolvedEvent extends BaseGameEvent {
  type: GameEventType.TRICK_EFFECT_RESOLVED;
  outcome: TrickEffectOutcome;
}

export interface RoundCompleteEvent extends BaseGameEvent {
  type: GameEventType.ROUND_COMPLETE;
  scores: { playerId: string; roundScore: number; totalScore: number }[];
}

export interface GameCompleteEvent extends BaseGameEvent {
  type: GameEventType.GAME_COMPLETE;
  /** First co-winner by seat (kept for older clients); see winnerIds for ties. */
  winnerId: string;
  finalScores: { playerId: string; score: number }[];
  /** Every player sharing the best score. Optional on the wire for older servers. */
  winnerIds?: string[];
  /** Final standings with competition ranking (ties share a rank). */
  standings?: IStanding[];
}

export interface TurnTimerExpiredEvent extends BaseGameEvent {
  type: GameEventType.TURN_TIMER_EXPIRED;
  playerId: string;
  playerName: string;
  sequence: number;
}

export interface TimeoutSoundPlayedEvent extends BaseGameEvent {
  type: GameEventType.TIMEOUT_SOUND_PLAYED;
  targetPlayerId: string;
  targetPlayerName: string;
  senderPlayerId: string;
  senderPlayerName: string;
  soundName?: SoundboardSoundName;
  customAudio?: CustomSound;
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

/** The receiving player's projection of the game (never another player's hand or hidden bid). */
export interface GameStateEvent extends BaseGameEvent {
  type: GameEventType.GAME_STATE;
  state: IGameState;
  yourPlayerId: string;
  /**
   * Room-wide, monotonic across restarts: a snapshot with a lower version than one already
   * applied is stale. Absent from servers (and in-browser transports) older than protocol 2.
   */
  stateVersion?: number;
  /** Only sent by servers older than protocol 2; newer servers send SHARED_SOUNDS instead. */
  sharedCustomSounds?: SharedCustomSound[];
  /** Tournament match rooms only: the match lock as the table sees it (names, never account ids). */
  tournamentMatch?: TournamentMatchRoomState;
}

/** A command was refused. `code` and `requestId` identify why and which command. */
export interface ErrorEvent extends BaseGameEvent {
  type: GameEventType.ERROR;
  message: string;
  /** Domain error code (GameError.code) or a ProtocolErrorCode. */
  code?: string;
  /** The requestId of the refused command, when it carried one. */
  requestId?: string;
}

/**
 * Sent to the joining connection only. `sessionToken` is the seat's secret: the client keeps it for
 * this room and presents it to resume the seat. It never appears in any other message.
 */
export interface SessionEvent extends BaseGameEvent {
  type: GameEventType.SESSION;
  playerId: string;
  sessionToken: string;
  protocolVersion: number;
}

/** Answer to PING, sent to the asking connection only. */
export interface PongEvent extends BaseGameEvent {
  type: GameEventType.PONG;
  /** The PING's requestId, when it carried one. */
  requestId?: string;
}

/**
 * Sent to the commanding connection only (protocol 2), after the messages the command caused: the
 * command with this requestId was applied, now or by an earlier send of the same requestId. A
 * refused command is answered with ERROR instead. Clients that never receive it (older servers)
 * keep a command unsettled until its time to live runs out.
 */
export interface CommandAckEvent extends BaseGameEvent {
  type: GameEventType.COMMAND_ACK;
  requestId: string;
  /** The room's state version after the command; the snapshot it produced is not older. */
  stateVersion: number;
}

/** The custom sounds the seated players share with the table, in seat order. */
export interface SharedSoundsEvent extends BaseGameEvent {
  type: GameEventType.SHARED_SOUNDS;
  sounds: SharedCustomSound[];
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
// Full Union Type
// ============================================================================

export type GameEvent =
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PlayerReconnectedEvent
  | PlayerGracedEvent
  | PlayerGraceExpiredEvent
  | PlayerGraceRestoredEvent
  | PlayerKickedEvent
  | HostChangedEvent
  | GameStartedEvent
  | RoundStartedEvent
  | TrumpRevealedEvent
  | TrumpSelectedEvent
  | BidPlacedEvent
  | BiddingCompleteEvent
  | CardPlayedEvent
  | TrickCompleteEvent
  | TrickEffectResolvedEvent
  | RoundCompleteEvent
  | GameCompleteEvent
  | TurnTimerExpiredEvent
  | TimeoutSoundPlayedEvent
  | GamePausedEvent
  | GameResumedEvent
  | GameStateEvent
  | ErrorEvent
  | SessionEvent
  | PongEvent
  | CommandAckEvent
  | SharedSoundsEvent
  | EmoteEvent
  | ChatMessageEvent
  | RematchRequestedEvent
  | RematchStartedEvent;

/**
 * Events that may go to every connection in the room. Anything personal (a projection of the game,
 * a session token, a refusal, a sound aimed at one player) is excluded, so the server's broadcast
 * cannot be handed one by mistake.
 */
export type BroadcastEvent = Exclude<
  GameEvent,
  GameStateEvent | ErrorEvent | SessionEvent | PongEvent | CommandAckEvent | TimeoutSoundPlayedEvent
>;
