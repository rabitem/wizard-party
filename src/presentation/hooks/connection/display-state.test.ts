import { describe, expect, it } from 'vitest';

import { CardType, GamePhase, Suit, type ICard, type IGameState } from '@shared/domain';

import { selectDisplayState } from './display-state';

function card(id: string): ICard {
  return { id, type: CardType.NUMBER, suit: Suit.HUMANS, value: 3 } as unknown as ICard;
}

function server(hand: string[], trick: string[] = []): IGameState {
  return {
    id: 'room-1',
    phase: GamePhase.PLAYING,
    players: [
      { id: 'me', name: 'Merlin', hand: hand.map(card) },
      { id: 'bob', name: 'Bob', hand: [] },
    ],
    currentPlayerIndex: 0,
    currentRound: 2,
    completedTricks: [],
    currentTrick: trick.length ? { cards: trick.map((id) => ({ playerId: 'bob', card: card(id) })), leadSuit: null, winnerId: null } : null,
  } as unknown as IGameState;
}

describe('selectDisplayState', () => {
  it('should show the server state as is when nothing is presented or pending', () => {
    const state = server(['c1']);
    expect(selectDisplayState({ serverState: state, playerId: 'me', frozenTrick: null, pendingPlay: null })).toBe(state);
  });

  it('should take a pending local play out of the hand and onto the table without touching the server state', () => {
    const state = server(['c1', 'c2'], ['b1']);
    const display = selectDisplayState({ serverState: state, playerId: 'me', frozenTrick: null, pendingPlay: { cardId: 'c1', requestId: 'r1' } });

    expect(display?.players[0].hand.map((entry) => entry.id)).toEqual(['c2']);
    expect(display?.currentTrick?.cards.map((entry) => entry.card.id)).toEqual(['b1', 'c1']);
    expect(display?.players[1]).toBe(state.players[1]);
    expect(state.players[0].hand).toHaveLength(2);
  });

  it('should keep a play that completed the presented trick out of the hand until the server confirms it', () => {
    const state = server(['c1', 'c2']);
    const frozenTrick = { cards: [{ playerId: 'bob', card: card('b1') }, { playerId: 'me', card: card('c1') }], leadSuit: null, winnerId: 'bob' };
    const display = selectDisplayState({ serverState: state, playerId: 'me', frozenTrick, pendingPlay: { cardId: 'c1', requestId: 'r1' } });

    expect(display?.players[0].hand.map((entry) => entry.id)).toEqual(['c2']);
    expect(display?.currentTrick).toBe(frozenTrick);
  });

  it('should show the presented trick instead of the next one', () => {
    const state = server(['c1'], ['next']);
    const frozenTrick = { cards: [{ playerId: 'bob', card: card('old') }], leadSuit: null, winnerId: 'bob' };
    const display = selectDisplayState({ serverState: state, playerId: 'me', frozenTrick, pendingPlay: null });

    expect(display?.currentTrick).toBe(frozenTrick);
    expect(display?.players).toBe(state.players);
  });
});
