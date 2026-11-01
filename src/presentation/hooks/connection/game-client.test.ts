import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardType, ClientCommandType, GameEventType, GamePhase, PROTOCOL_VERSION, Suit } from '@shared/domain';

import { createConnectionActions, createGameClient } from './game-client';
import { TableFeeds } from './table-feeds';
import { fakeSessionDeps, type FakeSocket } from './test-support/fake-socket';

function humans(id: string) {
  return { id, type: CardType.NUMBER, suit: Suit.HUMANS, value: 3 };
}

/** Merlin (player-1, the local player) holds `hand`; his own cards `trick` are on the table. */
function playing(hand: string[], trick: string[] = [], currentPlayerIndex = 0) {
  return {
    id: 'room-1',
    phase: GamePhase.PLAYING,
    currentRound: 2,
    currentPlayerIndex,
    players: [
      { id: 'player-1', name: 'Merlin', hand: hand.map(humans) },
      { id: 'player-2', name: 'Morgana', hand: [] },
    ],
    completedTricks: [],
    currentTrick: trick.length ? { cards: trick.map((id) => ({ playerId: 'player-1', card: humans(id) })), leadSuit: Suit.HUMANS, winnerId: null } : null,
  };
}

function snapshot(socket: FakeSocket, state: ReturnType<typeof playing>): void {
  socket.receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'player-1', state });
}

/** The production composition on a fake transport; Merlin is seated at a table where he is to play. */
function seatedClient() {
  const { deps, sockets, tokens } = fakeSessionDeps();
  const client = createGameClient({ ...deps, feeds: new TableFeeds({ ticketStorage: null }) });
  const connection = createConnectionActions(client);
  connection.connect('localhost', 'room-1', 'Merlin');
  const socket = sockets[0];
  socket.open();
  socket.receive({ type: GameEventType.SESSION, playerId: 'player-1', sessionToken: 'seat-token', protocolVersion: PROTOCOL_VERSION });
  snapshot(socket, playing(['c1', 'c2']));
  const lastRequestId = () => socket.sent.at(-1)?.requestId;
  const isOnTable = (cardId: string) => client.trick.getState().visiblePlayedCardIds.has(cardId);
  return { client, connection, socket, sockets, tokens, lastRequestId, isOnTable };
}

describe('createGameClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should treat an acknowledgement whose snapshot still holds the card as a refusal', () => {
    const { client, socket, lastRequestId, isOnTable } = seatedClient();
    client.commands.playCard('c1');
    const play = lastRequestId();
    expect(isOnTable('c1')).toBe(true);

    // The server answered the play without applying it: its snapshot still holds the card.
    snapshot(socket, playing(['c1', 'c2']));
    socket.receive({ type: GameEventType.COMMAND_ACK, requestId: play });

    expect(client.store.getState().pendingPlay).toBeNull();
    expect(isOnTable('c1')).toBe(false);
  });

  it('should confirm the play from a snapshot without the card, before any acknowledgement, and keep the card on the table', () => {
    const { client, socket, lastRequestId, isOnTable } = seatedClient();
    client.commands.playCard('c1');
    const play = lastRequestId();

    snapshot(socket, playing(['c2'], ['c1'], 1));
    expect(client.store.getState().pendingPlay).toBeNull();
    expect(isOnTable('c1')).toBe(true);

    // The acknowledgement that follows finds nothing pending and retracts nothing.
    socket.receive({ type: GameEventType.COMMAND_ACK, requestId: play });
    expect(isOnTable('c1')).toBe(true);
  });

  it('should leave the pending play alone when another command settles', () => {
    const { client, socket, lastRequestId, isOnTable } = seatedClient();
    client.commands.playCard('c1');
    client.commands.sendChat('good luck');
    socket.receive({ type: GameEventType.COMMAND_ACK, requestId: lastRequestId() });

    expect(client.store.getState().pendingPlay?.cardId).toBe('c1');
    expect(isOnTable('c1')).toBe(true);
  });

  it('should ignore a second card tap while a play is pending', () => {
    const { client, socket, isOnTable } = seatedClient();
    client.commands.playCard('c1');
    client.commands.playCard('c2');

    expect(socket.types().filter((type) => type === ClientCommandType.PLAY_CARD)).toHaveLength(1);
    expect(client.store.getState().pendingPlay?.cardId).toBe('c1');
    expect(isOnTable('c2')).toBe(false);
  });

  it('should send LEAVE_GAME before closing on leaveGame, keep the seat token and forget the table', async () => {
    const { client, connection, socket, sockets, tokens } = seatedClient();

    await connection.leaveGame();

    expect(socket.types().at(-1)).toBe(ClientCommandType.LEAVE_GAME);
    expect(socket.closed).toBe(true);
    // Leaving a running game hands the seat to a bot; the token is what takes it back later.
    expect(tokens.get('room-1')).toBe('seat-token');
    expect(client.store.getState()).toMatchObject({ status: 'idle', serverState: null, playerId: null });
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });
});
