import type { IGameState, ITrick } from '@shared/domain';

import type { PendingPlay } from './game-client-state';

export interface DisplayStateInput {
  serverState: IGameState | null;
  playerId: string | null;
  /** The completed trick the table presents instead of the server's current trick. */
  frozenTrick: ITrick | null;
  /** The local play in flight: out of the hand, on the table, until the server decides. */
  pendingPlay: PendingPlay | null;
}

/**
 * The card leaves the hand; it joins the open trick unless a completed trick is presented (the
 * play that completed it is already part of that trick).
 */
function withPendingPlay(state: IGameState, playerId: string, pendingPlay: PendingPlay, joinTrick: boolean): IGameState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const card = player?.hand.find((candidate) => candidate.id === pendingPlay.cardId);
  if (!player || !card) return state;
  const trick: ITrick = state.currentTrick ?? { cards: [], leadSuit: null, winnerId: null };
  const onTable = !joinTrick || trick.cards.some((played) => played.card.id === card.id);
  return {
    ...state,
    players: state.players.map((candidate) => candidate === player
      ? { ...player, hand: player.hand.filter((handCard) => handCard.id !== card.id) }
      : candidate),
    currentTrick: onTable ? state.currentTrick : { ...trick, cards: [...trick.cards, { playerId, card }] },
  };
}

/**
 * The game as the table shows it: the server's state, with the presented (frozen) trick in place
 * of its current trick, and the local player's unconfirmed play already out of the hand and on
 * the table. Pure; the inputs stay untouched and an unchanged input returns the same object.
 */
export function selectDisplayState({ serverState, playerId, frozenTrick, pendingPlay }: DisplayStateInput): IGameState | null {
  if (!serverState) return null;
  const presented = frozenTrick ? { ...serverState, currentTrick: frozenTrick } : serverState;
  return pendingPlay && playerId ? withPendingPlay(presented, playerId, pendingPlay, !frozenTrick) : presented;
}
