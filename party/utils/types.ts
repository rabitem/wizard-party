import type * as Party from "../runtime";
import {
  JESTER_SOUND_NAMES,
  TRICK_WIN_SOUND_NAMES,
  WIZARD_SOUND_NAMES,
  Game,
  type BroadcastEvent,
  type ConnectionCloseCode,
  type ConnectionCloseReason,
  type GameEvent,
  IGameState,
  IPlayer,
  IPauseState,
  IRoomSettings,
  IRulesetConfig,
  SoundPreferences,
} from "../../shared/domain";
import type { ISessionCredentialFactory, IUseCaseRegistry } from "../../shared/application";
import type { GameTelemetry } from "../telemetry";

/** Storage key of the room's state. */
export const PERSISTED_STATE_KEY = 'gameState';

/**
 * Version of the persisted room format; the loader reads every earlier one. Rooms written by
 * older releases of either schema may also hold retired fields (`mutedPlayers`, a room
 * `password` inside `roomSettings`); the loader ignores them and the next save drops them.
 */
export const PERSISTED_SCHEMA_VERSION = 2;

/**
 * Schema 2: the game aggregate (its own toJSON, restored by Game.fromJSON) plus the server's own
 * bookkeeping. Uploaded audio is not persisted (clients resend it on connect).
 */
export interface PersistedState {
  schemaVersion: typeof PERSISTED_SCHEMA_VERSION;
  gameState: IGameState | null;
  /** Browser persistent id -> seat. */
  persistentIdToPlayerId: [string, string][];
  /** Seat -> secret session token (server-private storage; never sent to anyone but the seat). */
  sessionTokens: [string, string][];
  roomSettings: IRoomSettings;
  botCounter: number;
  /** Last GAME_STATE version sent, so versions keep increasing across restarts. */
  stateVersion: number;
  /** Built-in sound choices only. */
  playerSoundPreferences: [string, SoundPreferences][];
  /** Recently applied requestIds per seat, so a resent command is not applied twice. */
  recentCommandIdsByPlayer: [string, [string, number][]][];
}

/**
 * Schema 1 (no `schemaVersion`): rooms written before the format was versioned. Players, host,
 * pause and ruleset were stored twice (inside the game and next to it), and sound preferences
 * with their audio.
 */
export interface LegacyPersistedState {
  gameState: IGameState | null;
  persistentIdToPlayerId: [string, string][];
  roomSettings: IRoomSettings;
  botCounter: number;
  players: IPlayer[];
  hostId: string;
  pauseState: IPauseState | null;
  playerSoundPreferences?: [string, SoundPreferences][];
  rulesetConfig?: IRulesetConfig;
  recentCommandIdsByPlayer?: [string, [string, number][]][];
}

/** Whatever a room's storage may hold. */
export type StoredState = PersistedState | LegacyPersistedState;

/**
 * What a handler sees of the room. `game`, `botCounter` and `roomSettings` always read the room's
 * current values (a rematch replaces the game; the setters change them). Handlers never schedule
 * anything: when the transaction ends, the room arms its bot turn and its alarm from the state it
 * left (see party/room/room-clockwork.ts).
 */
export interface ServerContext {
  // Core dependencies
  room: Party.Room;
  game: Game;
  useCases: IUseCaseRegistry;
  /** Records domain events that do not originate from a use case (timers, recovery). */
  telemetry: GameTelemetry;

  // Connection mappings
  /** Browser persistent id -> seat. Keys kick bans and join de-duplication; opens only legacy seats. */
  persistentIdToPlayerId: Map<string, string>;
  /** Seat -> secret session token. A seat with a token can only be resumed with that token. */
  sessionTokens: Map<string, string>;
  /** Generates seat ids and session tokens (cryptographically random in production). */
  sessionCredentials: ISessionCredentialFactory;
  connectionToPlayer: Map<string, string>;
  activeConnections: Map<string, Party.Connection>;

  roomSettings: IRoomSettings;
  botCounter: number;
  playerSoundPreferences: Map<string, SoundPreferences>;

  // Idempotency tracking for join requests
  /** Set of persistentIds currently being processed (prevents duplicate concurrent joins) */
  processingJoins: Set<string>;
  /** Map of persistentId -> timestamp of last successful join (for deduplication) */
  recentJoins: Map<string, number>;

  /**
   * Drops the pending "disconnected" of a seat whose socket closed moments ago (it rejoined, or
   * was removed); true when one was pending.
   */
  cancelPendingDisconnect: (playerId: string) => boolean;

  // Methods for state updates (setters)
  setGame: (game: Game) => void;
  setBotCounter: (counter: number) => void;
  setRoomSettings: (settings: IRoomSettings) => void;

  // Communication methods
  /** To every joined connection; only events without private data are accepted. */
  broadcast: (event: BroadcastEvent) => void;
  sendToConnection: (conn: Party.Connection, event: GameEvent) => void;
  /** Closes a connection after the messages already queued for it (e.g. why it is being closed). */
  closeConnection: (conn: Party.Connection, code: ConnectionCloseCode, reason: ConnectionCloseReason) => void;
  /** Sends the room's shared custom sounds to the table when the set changed. */
  syncSharedSounds: () => void;
  /**
   * Rejects the current command: tells the client `message` and records a `command.rejected` fact
   * (from `error` when given, so the real cause is kept even if the client sees a generic message).
   */
  sendError: (conn: Party.Connection, message: string, code?: string, error?: unknown) => void;

  // State methods
  /** Sends each joined connection its own projection of the game, with the next state version. */
  broadcastPersonalizedState: () => void;
  /** Writes the room before the current transaction's messages go out (see CommitGate). */
  saveState: () => void;
}

// Trick win sounds for random selection (server-side to ensure all clients get same sound)
export const TRICK_WIN_SOUNDS = [
  ...TRICK_WIN_SOUND_NAMES,
] as const;

export const WIZARD_SOUNDS = [
  ...WIZARD_SOUND_NAMES,
] as const;

export const JESTER_SOUNDS = [
  ...JESTER_SOUND_NAMES,
] as const;
