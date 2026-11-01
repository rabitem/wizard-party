import { GameEventType, GamePhase, type IGameState } from '@shared/domain';
import type { LobbyActivityEntry } from '@/presentation/types';

/** A lobby activity entry before the feed assigns its id. */
export type LobbyActivityDraft = Omit<LobbyActivityEntry, 'id'>;

/** The fields of a server event the activity feed reads. */
export interface LobbyActivitySourceEvent {
  type: string;
  playerId?: unknown;
  playerName?: unknown;
  hostId?: unknown;
}

function isLobby(state: IGameState | null): state is IGameState {
  return state?.phase === GamePhase.LOBBY;
}

function nameOf(state: IGameState, playerId: unknown): string | undefined {
  if (typeof playerId !== 'string') return undefined;
  return state.players.find((player) => player.id === playerId)?.name;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Maps a server event to a lobby activity entry. `state` is the state the client held when the
 * event arrived (the server sends events before the state they produced), so departed players can
 * still be named. Returns null outside the lobby, for events that are not lobby activity, and for
 * the local player's own join.
 */
export function activityFromEvent(
  event: LobbyActivitySourceEvent,
  state: IGameState | null,
  localPlayerId: string | null,
  at: number
): LobbyActivityDraft | null {
  if (!isLobby(state)) return null;

  switch (event.type) {
    case GameEventType.PLAYER_JOINED:
      if (event.playerId === localPlayerId) return null;
      return { kind: 'joined', playerName: stringOrUndefined(event.playerName), at };
    case GameEventType.PLAYER_LEFT:
      return { kind: 'left', playerName: nameOf(state, event.playerId), at };
    case GameEventType.PLAYER_KICKED:
      return { kind: 'kicked', playerName: stringOrUndefined(event.playerName) ?? nameOf(state, event.playerId), at };
    case GameEventType.HOST_CHANGED:
      return { kind: 'host', playerName: nameOf(state, event.hostId), at };
    default:
      return null;
  }
}

function roomSettingsKey(state: IGameState): string {
  const settings = state.roomSettings;
  return JSON.stringify([settings?.name, settings?.isPublic, settings?.maxPlayers]);
}

/**
 * Detects ruleset and room-settings changes between two consecutive lobby states of the same
 * room. Credited to the host of the newer state (only the host can change either).
 */
export function activityFromStateChange(
  previous: IGameState | null,
  next: IGameState,
  at: number
): LobbyActivityDraft[] {
  if (!isLobby(previous) || !isLobby(next) || previous.id !== next.id) return [];

  const hostName = nameOf(next, next.hostId);
  const entries: LobbyActivityDraft[] = [];
  if (JSON.stringify(previous.rulesetConfig ?? null) !== JSON.stringify(next.rulesetConfig ?? null)) {
    entries.push({ kind: 'rules', playerName: hostName, at });
  }
  if (roomSettingsKey(previous) !== roomSettingsKey(next)) {
    entries.push({ kind: 'settings', playerName: hostName, at });
  }
  return entries;
}

/** Appends entries and keeps only the newest `maxEntries`. */
export function appendLobbyActivity(
  feed: LobbyActivityEntry[],
  entries: LobbyActivityEntry[],
  maxEntries: number
): LobbyActivityEntry[] {
  if (entries.length === 0) return feed;
  return [...feed, ...entries].slice(-maxEntries);
}
