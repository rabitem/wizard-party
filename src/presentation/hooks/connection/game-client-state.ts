import type { IGameState, SharedCustomSound } from '@shared/domain';
import { getLegalPlays } from '@shared/application/projections/legal-plays';
import { replaceEqualDeep } from '@/presentation/utils/replace-equal-deep';
import type { ConnectionStatus, TimeoutSoundEvent } from '@/presentation/types';

/** Timeout sounds kept for the effects that play them (the newest few). */
const MAX_TIMEOUT_SOUND_EVENTS = 10;

/** A card the local player played that the server has not confirmed yet. */
export interface PendingPlay {
  cardId: string;
  requestId: string;
}

/**
 * The client's copy of the connection and the game, as the connection layer writes it. The
 * server's state is kept exactly as received (with structural sharing), never patched for
 * presentation; what the table shows is derived from it (display-state.ts).
 */
export interface GameClientState {
  status: ConnectionStatus;
  error: string | null;
  serverState: IGameState | null;
  playerId: string | null;
  /** Ids of the cards the local player may play now (shared domain rule), stable while unchanged. */
  legalCardIds: readonly string[];
  sharedCustomSounds: SharedCustomSound[];
  timeoutSoundEvents: TimeoutSoundEvent[];
  pendingPlay: PendingPlay | null;
}

export const INITIAL_GAME_CLIENT_STATE: GameClientState = {
  status: 'idle',
  error: null,
  serverState: null,
  playerId: null,
  legalCardIds: [],
  sharedCustomSounds: [],
  timeoutSoundEvents: [],
  pendingPlay: null,
};

function hasCardInHand(state: IGameState | null, playerId: string | null, cardId: string): boolean {
  return !!state?.players.find((player) => player.id === playerId)?.hand.some((card) => card.id === cardId);
}

/** True while the local play is still undecided: its card is in the hand the server last sent. */
export function isPendingPlayOpen(state: GameClientState): boolean {
  const { pendingPlay } = state;
  return !!pendingPlay && hasCardInHand(state.serverState, state.playerId, pendingPlay.cardId);
}

/**
 * Applies a GAME_STATE: structurally shared with the state held (an identical snapshot changes
 * nothing, unchanged players and cards keep their identity), legal plays derived once, and a
 * pending play confirmed once its card left the hand.
 */
export function withSnapshot(state: GameClientState, snapshot: IGameState, playerId: string): GameClientState {
  const serverState = replaceEqualDeep(state.serverState, snapshot);
  const legalCardIds = replaceEqualDeep(state.legalCardIds, getLegalPlays(serverState, playerId).map((card) => card.id));
  const confirmed = state.pendingPlay && !hasCardInHand(serverState, playerId, state.pendingPlay.cardId);
  const pendingPlay = confirmed ? null : state.pendingPlay;
  if (serverState === state.serverState && playerId === state.playerId && legalCardIds === state.legalCardIds && pendingPlay === state.pendingPlay) {
    return state;
  }
  return { ...state, serverState, playerId, legalCardIds, pendingPlay };
}

export function withSharedSounds(state: GameClientState, sounds: SharedCustomSound[]): GameClientState {
  const sharedCustomSounds = replaceEqualDeep(state.sharedCustomSounds, sounds);
  return sharedCustomSounds === state.sharedCustomSounds ? state : { ...state, sharedCustomSounds };
}

export function withTimeoutSound(state: GameClientState, event: TimeoutSoundEvent): GameClientState {
  return { ...state, timeoutSoundEvents: [...state.timeoutSoundEvents.slice(-(MAX_TIMEOUT_SOUND_EVENTS - 1)), event] };
}

/** The room is gone for this client (left, disconnected, refused): nothing of it stays valid. */
export function withoutRoom(state: GameClientState): GameClientState {
  return {
    ...state,
    serverState: null,
    playerId: null,
    legalCardIds: [],
    sharedCustomSounds: [],
    timeoutSoundEvents: [],
    pendingPlay: null,
  };
}
