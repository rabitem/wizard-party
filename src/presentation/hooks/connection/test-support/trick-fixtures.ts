import { CardType, GamePhase, type ICard, type IGameState } from '@shared/domain';

import type { TrickCompleteInput, TrickPresentation } from '../trick-presentation';

/** Seen from Morgana's seat; Merlin (player-1) is to act, so the local turn never fast-forwards. */
export const OPPONENT = 'player-2';

function card(id: string): ICard {
  return { id, type: CardType.NUMBER, suit: null, value: null } as unknown as ICard;
}

/** Cards of a trick, played by player-1, player-2, ... in order. */
export function played(cardIds: string[]): { playerId: string; card: ICard }[] {
  return cardIds.map((id, index) => ({ playerId: `player-${index + 1}`, card: card(id) }));
}

/** A completed trick won by Morgana, as completedTricks holds it. */
export function completedTrick(cardIds: string[]) {
  return { cards: played(cardIds), leadSuit: null, winnerId: 'player-2' };
}

/** A round-1 table of four players whose current trick holds `cardIds`. */
export function state(cardIds: string[] = [], overrides: Partial<IGameState> = {}): IGameState {
  return {
    id: 'room-1',
    phase: GamePhase.PLAYING,
    players: [
      { id: 'player-1', name: 'Merlin' },
      { id: 'player-2', name: 'Morgana' },
      { id: 'player-3', name: 'Nimue' },
      { id: 'player-4', name: 'Arthur' },
    ],
    currentPlayerIndex: 0,
    currentRound: 1,
    completedTricks: [],
    currentTrick: { cards: played(cardIds), leadSuit: null, winnerId: null },
    ...overrides,
  } as unknown as IGameState;
}

/** TRICK_COMPLETE as the server sends it: Morgana wins trick `trickIndex` with `cardIds`. */
export function trickComplete(trickIndex: number, cardIds: string[], currentState: IGameState | null): TrickCompleteInput {
  return {
    winnerId: 'player-2',
    winnerName: 'Morgana',
    soundChoice: undefined,
    trickCards: played(cardIds),
    trickIndex,
    currentState,
    timestamp: trickIndex + 1,
  };
}

/** The table lands a trick's flights, in order, before it reports the trick landed. */
export function landTrick(presentation: TrickPresentation, cardIds: string[]): void {
  for (const cardId of cardIds) presentation.playedCardLanded(cardId);
}

/** The table lands every card, reports the trick landed and collects it. */
export function collectTrick(presentation: TrickPresentation, cardIds: string[]): void {
  landTrick(presentation, cardIds);
  presentation.allCardsLanded();
  presentation.trickCollected();
}

export function visibleIds(presentation: TrickPresentation): string[] {
  return [...presentation.getState().visiblePlayedCardIds];
}

export function frozenIds(presentation: TrickPresentation): string[] | undefined {
  return presentation.getState().frozenTrick?.cards.map((entry) => entry.card.id);
}
