import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardType, GamePhase, PlayerKickedError, Suit, type ICard, type IGameState } from '@shared/domain';
import { ExternalStore } from '@/presentation/state/external-store';

import { ErrorNotice } from './error-notice';
import { INITIAL_GAME_CLIENT_STATE, withSnapshot, type GameClientState } from './game-client-state';
import type { GameEventContext } from './game-event-router';
import { createSessionListener } from './session-listener';
import { TableFeeds } from './table-feeds';
import { TrickPresentation } from './trick-presentation';

function card(id: string): ICard {
  return { id, type: CardType.NUMBER, suit: Suit.HUMANS, value: 3 } as unknown as ICard;
}

function server(hand: string[]): IGameState {
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
    currentTrick: null,
  } as unknown as IGameState;
}

function setup() {
  const seated = withSnapshot(INITIAL_GAME_CLIENT_STATE, server(['c1', 'c2']), 'me');
  const store = new ExternalStore<GameClientState>({ ...seated, pendingPlay: { cardId: 'c1', requestId: 'play-1' } });
  const trick = new TrickPresentation();
  const shownErrors: Array<string | null> = [];
  const errors = new ErrorNotice((message) => shownErrors.push(message));
  const feeds = new TableFeeds({ ticketStorage: null });
  const context: GameEventContext = {
    store,
    trick,
    session: { roomId: 'room-1', kicked: vi.fn(), refused: vi.fn() },
    errors,
    social: feeds.social,
    lobby: feeds.lobby,
    notices: feeds.notices,
    tournament: feeds.tournament,
    trace: vi.fn(),
  };
  const roomChanged = vi.fn();
  const listener = createSessionListener({ context, roomChanged, joinFields: () => ({ ticket: 't' }) });
  trick.cardPlayed({ cardId: 'c1', isLocalPlayer: true });
  return { store, trick, shownErrors, roomChanged, listener };
}

describe('createSessionListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should publish the status, clear notices once connected and keep the kick message', () => {
    const { store, shownErrors, listener } = setup();
    listener.onNotice('Failed to create connection');
    listener.onStatus('connected');
    expect(store.getState().status).toBe('connected');
    expect(shownErrors.at(-1)).toBeNull();

    listener.onStatus('kicked');
    vi.advanceTimersByTime(60_000);
    expect(shownErrors.at(-1)).toBe(PlayerKickedError.MESSAGE);
  });

  it('should forget the previous room when another room is connected', () => {
    const { store, trick, roomChanged, listener } = setup();
    listener.onRoomChanged();

    expect(store.getState().serverState).toBeNull();
    expect(store.getState().pendingPlay).toBeNull();
    expect(trick.getState().visiblePlayedCardIds.size).toBe(0);
    expect(roomChanged).toHaveBeenCalledTimes(1);
    expect(listener.joinFields('room-2')).toEqual({ ticket: 't' });
  });
});
