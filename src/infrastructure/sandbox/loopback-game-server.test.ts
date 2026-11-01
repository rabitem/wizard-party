import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, ConnectionCloseCode, GameEventType, GamePhase, type IGameState } from '@shared/domain';
import { ROOM_TIMING } from '../../../party/config/room-timing.config';
import { LoopbackGameServer } from './loopback-game-server';
import type { SandboxTableConfig } from '@/presentation/components/sandbox/sandbox.types';

const TABLE: SandboxTableConfig = { roomId: 'sandbox', playerCount: 4, round: 2, seed: 11, leadSeat: 0, startPhase: 'PLAYING' };

type Message = { type: string; state?: IGameState; yourPlayerId?: string; card?: { id: string } };

/** Opens a socket (the loopback opens on the next tick) and lets its messages arrive. */
async function open(server: LoopbackGameServer) {
  const socket = server.socketFactory({ host: 'sandbox.local', room: 'sandbox', query: {} });
  const messages: Message[] = [];
  socket.addEventListener('message', ((event: MessageEvent) => messages.push(JSON.parse(event.data))) as never);
  await vi.advanceTimersByTimeAsync(1);
  return { socket, messages };
}

/** Lets every delivery due within a network without latency arrive. */
const flush = () => vi.advanceTimersByTimeAsync(10);

async function connect(server: LoopbackGameServer) {
  const connection = await open(server);
  connection.socket.send(JSON.stringify({ type: ClientCommandType.JOIN_GAME }));
  await flush();
  return connection;
}

const playedCardIds = (messages: Message[]) => messages.filter((message) => message.type === GameEventType.CARD_PLAYED).map((message) => message.card?.id);

describe('LoopbackGameServer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The production room logs every command and broadcast.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should deal the same table for the same seed', () => {
    const first = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    const second = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    expect(first.game.toJSON().players.map((player) => player.hand)).toEqual(second.game.toJSON().players.map((player) => player.hand));
    expect(first.game.phase).toBe(GamePhase.PLAYING);
    expect(first.game.getCurrentPlayer().id).toBe(first.localPlayerId);
  });

  it('should keep delivery order under jitter and never deliver synchronously', async () => {
    const server = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' }, network: { latencyMs: 5, jitterMs: 20 } });
    const { socket, messages } = await connect(server);
    messages.length = 0;
    const cardId = server.game.getCurrentPlayer().hand[0].id;

    socket.send(JSON.stringify({ type: ClientCommandType.PLAY_CARD, cardId }));
    server.playBot();
    server.playBot();
    expect(messages).toHaveLength(0);
    // Every delivery is due within latency + jitter (25 ms) of its send.
    await vi.advanceTimersByTimeAsync(120);

    const roomOrder = server.game.currentTrick?.cards.map((played) => played.card.id);
    expect(roomOrder?.[0]).toBe(cardId);
    expect(playedCardIds(messages)).toEqual(roomOrder);
    expect(server.hasPendingDeliveries).toBe(false);
    server.dispose();
  });

  it('should lose messages while the connection is dropped and resync on rejoin', async () => {
    const server = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    const first = await connect(server);
    first.socket.send(JSON.stringify({ type: ClientCommandType.PLAY_CARD, cardId: server.game.getCurrentPlayer().hand[0].id }));
    server.dropConnection();
    server.playBot();
    await flush();
    expect(playedCardIds(first.messages)).toEqual([]);

    const second = await connect(server);
    const state = second.messages.find((message) => message.type === GameEventType.GAME_STATE)?.state;
    expect(state?.currentTrick?.cards).toHaveLength(2);
    server.dispose();
  });

  it('should run the production join: the local seat keeps its name whatever the client sends', async () => {
    const server = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    const { socket, messages } = await open(server);
    socket.send(JSON.stringify({ type: ClientCommandType.JOIN_GAME, playerName: 'Stored Name', protocolVersion: 2 }));
    await flush();

    expect(messages.map((message) => message.type)).toContain(GameEventType.SESSION);
    const snapshot = messages.find((message) => message.type === GameEventType.GAME_STATE);
    expect(snapshot?.yourPlayerId).toBe(server.localPlayerId);
    const state = snapshot?.state;
    expect(state?.players.find((player) => player.id === server.localPlayerId)?.name).toBe('You');
    // The attested join gets the local seat's view: its own cards, every other hand hidden.
    for (const player of state?.players ?? []) {
      const hidden = player.hand.map((card) => card.id === 'hidden');
      expect(hidden).toEqual(player.hand.map(() => player.id !== server.localPlayerId));
    }
    server.dispose();
  });

  it('should close an older socket of the seat as superseded, like production', async () => {
    const server = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    const first = await connect(server);
    const closes: number[] = [];
    first.socket.addEventListener('close', ((event: CloseEvent) => closes.push(event.code)) as never);

    await connect(server);

    expect(closes).toEqual([ConnectionCloseCode.SUPERSEDED]);
    server.dispose();
  });

  it('should pause the table for a local player who stays away, keeping its phase', async () => {
    const server = new LoopbackGameServer({ table: TABLE, bots: { mode: 'manual' } });
    await connect(server);

    server.dropConnection();
    await vi.advanceTimersByTimeAsync(ROOM_TIMING.DISCONNECT_DEBOUNCE_MS);

    expect(server.game.isPaused()).toBe(true);
    expect(server.game.phase).toBe(GamePhase.PLAYING);
    server.dispose();
  });
});
