import type * as Party from '../runtime';
import {
  DEFAULT_ROOM_SETTINGS,
  Game,
  ensureRoomSettings,
  type IRoomSettings,
  type SoundPreferences,
} from '../../shared/domain';
import { ProcessedCommandLog } from '../protocol/processed-commands';
import type { LoadStateResult } from '../utils/state';

/**
 * Everything a room holds in memory: the game and the bookkeeping around it. One object shared by
 * the room's collaborators (messaging, command pipeline, clockwork), so none of them keeps a copy
 * that could go stale (a rematch replaces the game, a restart replaces the maps).
 */
export class RoomState {
  game: Game;
  roomSettings: IRoomSettings;
  botCounter = 0;
  /** Version of the last GAME_STATE sent; persisted so it keeps increasing across restarts. */
  stateVersion = 0;

  // Seats and connections
  /** Browser persistent id -> seat. */
  persistentIdToPlayerId = new Map<string, string>();
  /** Seat -> secret session token. */
  sessionTokens = new Map<string, string>();
  connectionToPlayer = new Map<string, string>();
  readonly activeConnections = new Map<string, Party.Connection>();
  /** The protocol each connection joined with (absent: not joined, treated as legacy). */
  readonly connectionProtocols = new Map<string, number>();

  // Players' own settings
  playerSoundPreferences = new Map<string, SoundPreferences>();

  // Idempotency: joins in flight and recent joins (by persistent id), applied commands (by seat)
  readonly processingJoins = new Set<string>();
  readonly recentJoins = new Map<string, number>();
  processedCommands = new ProcessedCommandLog();
  /** Frames of sockets whose tournament join is still being verified, handled once it settled. */
  readonly heldMessages = new Map<string, string[]>();

  constructor(roomId: string) {
    this.game = new Game(roomId, '');
    this.roomSettings = ensureRoomSettings({ ...DEFAULT_ROOM_SETTINGS, name: roomId });
  }

  /** Takes over what the room's storage held (onStart). */
  restore(loaded: LoadStateResult): void {
    this.game = loaded.game;
    this.persistentIdToPlayerId = loaded.persistentIdToPlayerId;
    this.sessionTokens = loaded.sessionTokens;
    this.roomSettings = loaded.roomSettings;
    this.botCounter = loaded.botCounter;
    this.stateVersion = loaded.stateVersion;
    this.playerSoundPreferences = loaded.playerSoundPreferences;
    this.processedCommands = loaded.processedCommands;
  }

  /** The seat a connection holds, if it joined. */
  playerOf(connectionId: string): string | undefined {
    return this.connectionToPlayer.get(connectionId);
  }

  /** True while any connection holds the seat. */
  hasConnection(playerId: string): boolean {
    for (const mapped of this.connectionToPlayer.values()) if (mapped === playerId) return true;
    return false;
  }
}
