import { describe, expect, it } from 'vitest';

import { CardType, GamePhase, Suit, type ICard, type IGameState, type SharedCustomSound } from '@shared/domain';

import { INITIAL_GAME_CLIENT_STATE, isPendingPlayOpen, withSharedSounds, withSnapshot, withoutRoom } from './game-client-state';

function card(id: string, suit: Suit | null, type = CardType.NUMBER): ICard {
  return { id, type, suit, value: type === CardType.NUMBER ? 9 : null };
}

describe('withSnapshot legal plays (the shared domain rule, not a client copy)', () => {
  it('derives the lead suit from trick cards when the serialized trick omits leadSuit', () => {
    const state = {
      phase: GamePhase.PLAYING,
      currentPlayerIndex: 0,
      players: [
        { id: 'player-1', hand: [card('humans-9', Suit.HUMANS), card('elves-9', Suit.ELVES), card('wizard', null, CardType.WIZARD), card('jester', null, CardType.JESTER)] },
        { id: 'player-2', hand: [] },
      ],
      currentTrick: { cards: [{ playerId: 'player-2', card: card('lead-elves', Suit.ELVES) }], leadSuit: null },
    } as unknown as IGameState;

    expect(withSnapshot(INITIAL_GAME_CLIENT_STATE, state, 'player-1').legalCardIds).toEqual(['elves-9', 'wizard', 'jester']);
  });

  it('keeps the legal plays array while the answer does not change', () => {
    const state = {
      phase: GamePhase.PLAYING,
      currentPlayerIndex: 0,
      players: [{ id: 'player-1', hand: [card('elves-9', Suit.ELVES)] }, { id: 'player-2', hand: [] }],
      currentTrick: null,
    } as unknown as IGameState;
    const first = withSnapshot(INITIAL_GAME_CLIENT_STATE, state, 'player-1');
    const moved = withSnapshot(first, { ...state, turnTimerState: null } as IGameState, 'player-1');

    expect(moved.legalCardIds).toBe(first.legalCardIds);
  });
});

describe('withSnapshot pending play', () => {
  /** Merlin ('me') holds `hand`; Bob's cards `trick` are on the table. */
  function server(hand: string[], trick: string[] = []): IGameState {
    const humans = (id: string) => card(id, Suit.HUMANS);
    return {
      id: 'room-1',
      phase: GamePhase.PLAYING,
      players: [
        { id: 'me', name: 'Merlin', hand: hand.map(humans) },
        { id: 'bob', name: 'Bob', hand: [] },
      ],
      currentPlayerIndex: 0,
      currentRound: 2,
      completedTricks: [],
      currentTrick: trick.length ? { cards: trick.map((id) => ({ playerId: 'bob', card: humans(id) })), leadSuit: null, winnerId: null } : null,
    } as unknown as IGameState;
  }

  it('should confirm a pending play once its card left the hand', () => {
    const before = { ...withSnapshot(INITIAL_GAME_CLIENT_STATE, server(['c1', 'c2']), 'me'), pendingPlay: { cardId: 'c1', requestId: 'r1' } };
    expect(isPendingPlayOpen(before)).toBe(true);

    const after = withSnapshot(before, server(['c2'], ['c1']), 'me');

    expect(after.pendingPlay).toBeNull();
    expect(isPendingPlayOpen(after)).toBe(false);
  });
});

describe('room lifecycle', () => {
  it('should keep shared sounds that did not change and forget everything of a room that is gone', () => {
    const sound = { playerId: 'p', id: 's1', name: 'Boom', dataUrl: 'data:audio/mp3;base64,AA' } as unknown as SharedCustomSound;
    const withSounds = withSharedSounds(INITIAL_GAME_CLIENT_STATE, [sound]);
    expect(withSharedSounds(withSounds, [{ ...sound }])).toBe(withSounds);

    const gone = withoutRoom({ ...withSounds, pendingPlay: { cardId: 'c', requestId: 'r' } });
    expect(gone.sharedCustomSounds).toEqual([]);
    expect(gone.pendingPlay).toBeNull();
  });
});
