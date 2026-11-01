import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameEventType, GamePhase, SessionRejectedError, type IGameState } from '@shared/domain';
import { ExternalStore } from '@/presentation/state/external-store';

import { ErrorNotice } from './error-notice';
import { INITIAL_GAME_CLIENT_STATE, type GameClientState } from './game-client-state';
import { routeGameEvent, type GameEventContext } from './game-event-router';
import { TrickPresentation } from './trick-presentation';

const LOBBY: IGameState = {
  id: 'room-1',
  phase: GamePhase.LOBBY,
  currentRound: 0,
  currentPlayerIndex: 0,
  players: [
    { id: 'player-1', name: 'Merlin', hand: [] },
    { id: 'player-2', name: 'Morgana', hand: [] },
  ],
  currentTrick: null,
  completedTricks: [],
} as unknown as IGameState;

const META = { receivedAt: 1 };

function setup() {
  const store = new ExternalStore<GameClientState>(INITIAL_GAME_CLIENT_STATE);
  const trick = new TrickPresentation();
  const shownErrors: Array<string | null> = [];
  const ctx: GameEventContext = {
    store,
    trick,
    session: { roomId: 'room-1', kicked: vi.fn(), refused: vi.fn() },
    errors: new ErrorNotice((message) => shownErrors.push(message)),
    social: { handleEmote: vi.fn(), handleChatMessage: vi.fn(), handleBidPlaced: vi.fn(), handleRematchStarted: vi.fn() },
    lobby: { handleLobbyEvent: vi.fn(), handleLobbyStateChange: vi.fn(), resetLobbyActivity: vi.fn() },
    notices: { handleSpecialCardEvent: vi.fn(), clearSpecialCardNotices: vi.fn() },
    tournament: { onGameState: vi.fn(), onError: vi.fn(() => false), clearMatch: vi.fn() },
    trace: vi.fn(),
  };
  const route = (event: { type: string } & Record<string, unknown>) => routeGameEvent({ timestamp: 1, ...event }, ctx, META);
  const seat = () => route({ type: GameEventType.GAME_STATE, yourPlayerId: 'player-1', state: structuredClone(LOBBY) });
  return { ctx, store, trick, shownErrors, route, seat };
}

describe('routeGameEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply a snapshot, and change nothing when the same snapshot arrives again', () => {
    const { store, seat } = setup();
    const listener = vi.fn();
    seat();
    const applied = store.getState();
    store.subscribe(listener);
    seat();

    expect(applied.serverState?.id).toBe('room-1');
    expect(applied.playerId).toBe('player-1');
    expect(store.getState()).toBe(applied);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should forget the room and stop reconnecting when the seat belongs to another session', () => {
    const { ctx, store, shownErrors, route, seat } = setup();
    seat();
    route({ type: GameEventType.ERROR, message: SessionRejectedError.MESSAGE, code: 'SESSION_REJECTED' });

    expect(ctx.session.refused).toHaveBeenCalledTimes(1);
    expect(store.getState().serverState).toBeNull();
    expect(shownErrors.at(-1)).toBe(SessionRejectedError.MESSAGE);
    // Sticky: the lobby explains it until the player acts.
    vi.advanceTimersByTime(60_000);
    expect(shownErrors.at(-1)).toBe(SessionRejectedError.MESSAGE);
  });

  it('should forget a refused tournament seat and its match', () => {
    const { ctx, store, route, seat } = setup();
    seat();
    vi.mocked(ctx.tournament.onError).mockReturnValue(true);
    route({ type: GameEventType.ERROR, message: 'No seat for you', code: 'TOURNAMENT_SEAT_REFUSED' });

    expect(ctx.session.refused).toHaveBeenCalledTimes(1);
    expect(ctx.tournament.clearMatch).toHaveBeenCalledTimes(1);
    expect(store.getState().serverState).toBeNull();
  });

  it('should show an ordinary refusal for a while and keep the room', () => {
    const { ctx, store, shownErrors, route, seat } = setup();
    seat();
    route({ type: GameEventType.ERROR, message: 'Not your turn', requestId: 'req-1' });

    expect(ctx.session.refused).not.toHaveBeenCalled();
    expect(store.getState().serverState).not.toBeNull();
    expect(shownErrors.at(-1)).toBe('Not your turn');
    vi.advanceTimersByTime(60_000);
    expect(shownErrors.at(-1)).toBeNull();
  });

  it('should show the local player\'s played card at once and keep an opponent\'s waiting for its snapshot', () => {
    const { trick, route, seat } = setup();
    seat();
    route({ type: GameEventType.CARD_PLAYED, playerId: 'player-1', card: { id: 'card-1' } });
    route({ type: GameEventType.CARD_PLAYED, playerId: 'player-2', card: { id: 'card-2' } });

    const onTable = trick.getState().visiblePlayedCardIds;
    expect(onTable.has('card-1')).toBe(true);
    expect(onTable.has('card-2')).toBe(false);
  });

  it('should ignore messages it has no handler for', () => {
    const { store, route, seat } = setup();
    seat();
    const before = store.getState();
    route({ type: 'SOMETHING_NEW', payload: 1 });

    expect(store.getState()).toBe(before);
  });
});
