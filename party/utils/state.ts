import type * as Party from "../runtime";
import {
  Game,
  GamePhase,
  ensureRoomSettings,
  type IGameState,
  type IRoomSettings,
  type SoundPreferences,
} from "../../shared/domain";
import { ProcessedCommandLog } from "../protocol/processed-commands";
import {
  PERSISTED_SCHEMA_VERSION,
  PERSISTED_STATE_KEY,
  type LegacyPersistedState,
  type PersistedState,
  type StoredState,
} from "./types";
import { persistableSoundPreferences } from "./helpers";

export interface LoadStateResult {
  game: Game;
  persistentIdToPlayerId: Map<string, string>;
  sessionTokens: Map<string, string>;
  roomSettings: IRoomSettings;
  botCounter: number;
  /** The last GAME_STATE version the room sent; the next one continues from it. */
  stateVersion: number;
  playerSoundPreferences: Map<string, SoundPreferences>;
  processedCommands: ProcessedCommandLog;
}

function isLegacyState(stored: StoredState): stored is LegacyPersistedState {
  return (stored as Partial<PersistedState>).schemaVersion === undefined;
}

/**
 * Applies the stored rules to the empty lobby a room restarts with. An empty lobby has no seats
 * to restore, but it keeps its rules: a tournament table applies them only once, when its first
 * ticket locks it.
 */
function restoreLobbyRuleset(game: Game, stored: StoredState): void {
  const legacyRuleset = isLegacyState(stored) ? stored.rulesetConfig : undefined;
  const storedRuleset = legacyRuleset ?? stored.gameState?.rulesetConfig ?? stored.roomSettings?.rulesetConfig;
  if (storedRuleset) game.setRulesetConfig(storedRuleset);
}

/**
 * The game of a schema-1 blob. That schema also stored players, host, pause and ruleset next to
 * the game; they were written from the same aggregate, so the copies inside the game are used and
 * the duplicates only fill in what an older game blob may lack.
 */
function legacyGameState(stored: LegacyPersistedState): IGameState | null {
  if (!stored.gameState || stored.players.length === 0) return null;
  return {
    ...stored.gameState,
    hostId: stored.gameState.hostId || stored.hostId,
    players: stored.gameState.players?.length ? stored.gameState.players : stored.players,
    rulesetConfig: stored.gameState.rulesetConfig ?? stored.rulesetConfig,
    pauseState: stored.gameState.pauseState ?? stored.pauseState ?? null,
  };
}

/**
 * Restore policy after a restart: no socket survived it, so every human is disconnected until
 * their client rejoins. Bots never had a socket and stay connected (with their difficulty, which
 * the domain deserializer keeps). A game saved as phase PAUSED comes back in its real phase with
 * its pause (Game.fromJSON); a ROUND_END saved before its start was recorded waits from now.
 */
function restoreGame(roomId: string, gameState: IGameState): Game {
  const game = Game.fromJSON({ ...gameState, id: roomId });
  for (const player of game.players) {
    if (!player.isBot) player.isConnected = false;
  }
  if (game.phase === GamePhase.ROUND_END && game.roundEndedAt === null) game.roundEndedAt = Date.now();
  return game;
}

function emptyResult(roomId: string, defaultRoomSettings: IRoomSettings): LoadStateResult {
  return {
    game: new Game(roomId, ''),
    persistentIdToPlayerId: new Map(),
    sessionTokens: new Map(),
    roomSettings: ensureRoomSettings({ ...defaultRoomSettings, name: roomId }),
    botCounter: 0,
    stateVersion: 0,
    playerSoundPreferences: new Map(),
    processedCommands: new ProcessedCommandLog(),
  };
}

function restoreFrom(roomId: string, stored: StoredState, result: LoadStateResult): void {
  const gameState = isLegacyState(stored) ? legacyGameState(stored) : stored.gameState;
  if (gameState && gameState.players.length > 0) {
    result.game = restoreGame(roomId, gameState);
  } else {
    restoreLobbyRuleset(result.game, stored);
  }

  result.persistentIdToPlayerId = new Map(stored.persistentIdToPlayerId);
  result.sessionTokens = new Map(isLegacyState(stored) ? [] : stored.sessionTokens);
  result.botCounter = stored.botCounter;
  result.stateVersion = isLegacyState(stored) ? 0 : stored.stateVersion;
  // ensureRoomSettings keeps only the current fields, so a retired room password is dropped here.
  result.roomSettings = {
    ...ensureRoomSettings(stored.roomSettings, result.roomSettings),
    rulesetConfig: result.game.rulesetConfig,
  };
  result.playerSoundPreferences = new Map(stored.playerSoundPreferences ?? []);
  result.processedCommands = new ProcessedCommandLog(stored.recentCommandIdsByPlayer ?? []);
}

/**
 * Load persisted state from storage (either schema; see PersistedState).
 */
export async function loadState(
  room: Party.Room,
  defaultRoomSettings: IRoomSettings
): Promise<LoadStateResult> {
  const result = emptyResult(room.id, defaultRoomSettings);

  try {
    const stored = await room.storage.get<StoredState>(PERSISTED_STATE_KEY);
    if (stored) restoreFrom(room.id, stored, result);
  } catch (error) {
    console.error('[Server] Failed to restore state:', error);
  }

  return result;
}

export interface SaveStateParams {
  room: Party.Room;
  game: Game;
  persistentIdToPlayerId: Map<string, string>;
  sessionTokens: Map<string, string>;
  roomSettings: IRoomSettings;
  botCounter: number;
  stateVersion: number;
  playerSoundPreferences: Map<string, SoundPreferences>;
  processedCommands: ProcessedCommandLog;
}

/** The persisted form of the room (schema 2). Uploaded audio is left out: clients resend it. */
export function toPersistedState(params: Omit<SaveStateParams, 'room'>): PersistedState {
  return {
    schemaVersion: PERSISTED_SCHEMA_VERSION,
    gameState: params.game.toJSON(),
    persistentIdToPlayerId: Array.from(params.persistentIdToPlayerId),
    sessionTokens: Array.from(params.sessionTokens),
    roomSettings: params.roomSettings,
    botCounter: params.botCounter,
    stateVersion: params.stateVersion,
    playerSoundPreferences: Array.from(params.playerSoundPreferences, ([playerId, preferences]) =>
      [playerId, persistableSoundPreferences(preferences)] as [string, SoundPreferences]
    ),
    recentCommandIdsByPlayer: params.processedCommands.toJSON(),
  };
}

/**
 * Writes the room. The storage write is issued synchronously (before this function first awaits),
 * so a caller that sends messages right after calling it has them held until the write is durable
 * (Durable Object output gate). Failures are logged; the room keeps running from memory.
 */
export function saveState(params: SaveStateParams): Promise<void> {
  try {
    return params.room.storage.put(PERSISTED_STATE_KEY, toPersistedState(params)).catch((error: unknown) => {
      console.error('[Server] Failed to save state:', error);
    });
  } catch (error) {
    console.error('[Server] Failed to save state:', error);
    return Promise.resolve();
  }
}
