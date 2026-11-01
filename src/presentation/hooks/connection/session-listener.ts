import { PlayerKickedError } from '@shared/domain';

import type { CommandOutcome } from './command-outbox';
import { routeGameEvent, type GameEventContext } from './game-event-router';
import { isPendingPlayOpen, withoutRoom } from './game-client-state';
import type { GameSessionListener } from './game-session.types';

/** The client state a session writes into. */
export interface SessionTargets {
  /** Where server messages are routed: complete from construction, so none is dropped. */
  context: GameEventContext;
  /** Room-scoped feeds start over when another room is joined. */
  roomChanged: () => void;
  /** Extra JOIN_GAME fields for a room (a tournament ticket). */
  joinFields: (roomId: string) => Record<string, unknown>;
}

type ClientState = Pick<GameEventContext, 'store' | 'trick'>;

/** The room is gone for this client: its table, its trick presentation and its notices. */
export function forgetRoom({ store, trick }: ClientState): void {
  trick.reset({ forgetPresentedTricks: true });
  store.update(withoutRoom);
}

/**
 * The local play's command was settled. Refused, dropped, or acknowledged while the snapshot still
 * holds the card in the hand (the server did not apply it): the card goes back to the hand.
 */
export function settlePendingPlay({ store, trick }: ClientState, requestId: string, outcome: CommandOutcome): void {
  const state = store.getState();
  const { pendingPlay } = state;
  if (!pendingPlay || pendingPlay.requestId !== requestId) return;
  const applied = outcome === 'acknowledged' && !isPendingPlayOpen(state);
  if (!applied) trick.retractLocalPlay(pendingPlay.cardId);
  store.update((current) => ({ ...current, pendingPlay: null }));
}

/** Connects a GameSession to the client state: status, routed messages, settled commands. */
export function createSessionListener({ context, roomChanged, joinFields }: SessionTargets): GameSessionListener {
  const { store, errors } = context;
  return {
    onStatus: (status) => {
      store.update((state) => (state.status === status ? state : { ...state, status }));
      if (status === 'connected') errors.clear();
      if (status === 'kicked') errors.show(PlayerKickedError.MESSAGE, { sticky: true });
    },
    onEvent: (event, meta) => routeGameEvent(event, context, meta),
    onCommandSettled: (entry, outcome) => settlePendingPlay(context, entry.requestId, outcome),
    onNotice: (message) => errors.show(message),
    onRoomChanged: () => {
      // Nothing of the previous room may route or render while the new one is joined.
      forgetRoom(context);
      roomChanged();
    },
    joinFields,
    currentState: () => store.getState().serverState,
  };
}
