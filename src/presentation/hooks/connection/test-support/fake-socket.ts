
import { GameEventType } from '@shared/domain';
import type { ConnectionStatus } from '@/presentation/types';

import { ConnectionTelemetry } from '../connection-telemetry';
import { GameSession } from '../game-session';
import type { GameSessionDeps, GameSessionListener } from '../game-session.types';
import type { GameSocket, GameSocketOptions } from '../game-socket';

type Listener = (event?: unknown) => void;

/**
 * A scripted WebSocket: the test opens it, drops it and delivers server frames. `close()` only
 * marks it closed (a retired socket's late close event never arrives), like a socket the browser
 * has not reported back on yet.
 */
export class FakeSocket {
  readyState = 0;
  closed = false;
  readonly sent: Array<{ type: string; requestId?: string; [key: string]: unknown }> = [];
  private readonly listeners = new Map<string, Set<Listener>>();
  private throwOnNextSend = false;

  constructor(readonly options: GameSocketOptions) {}

  send(data: string): void {
    if (this.throwOnNextSend) {
      this.throwOnNextSend = false;
      throw new Error('socket closed during send');
    }
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.closed = true;
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  open(): void {
    this.readyState = 1;
    this.emit('open');
  }

  /** The connection is lost (or closed by the server with `code`). */
  drop(code = 1006): void {
    this.readyState = 3;
    this.emit('close', { code, reason: '', wasClean: false });
  }

  /** A server close as PartySocket reports it: the original close event nested in `reason`. */
  dropNested(code: number, reason: string): void {
    this.readyState = 3;
    this.emit('close', { code: 'close', reason: { code, reason, wasClean: true } });
  }

  /** The next send throws, as a socket closing underneath the browser does. */
  failNextSend(): void {
    this.throwOnNextSend = true;
  }

  receive(data: Record<string, unknown>): void {
    this.emit('message', { data: JSON.stringify({ timestamp: 1, ...data }) });
  }

  types(): string[] {
    return this.sent.map((message) => message.type);
  }

  private emit(type: string, event?: unknown): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
}

const NO_REALTIME = {
  connecting: () => undefined,
  opened: () => undefined,
  closed: () => undefined,
  connectTimedOut: () => undefined,
  commandSent: () => undefined,
  messageReceived: () => undefined,
};

/** The session's ports with a fake transport: every socket it opens and its seat tokens. */
export function fakeSessionDeps() {
  const sockets: FakeSocket[] = [];
  const tokens = new Map<string, string>();
  const deps: GameSessionDeps = {
    socketFactory: (options) => {
      const socket = new FakeSocket(options);
      sockets.push(socket);
      return socket as unknown as GameSocket;
    },
    seatTokens: {
      load: (roomId) => tokens.get(roomId),
      save: (roomId, token) => void tokens.set(roomId, token),
      forget: (roomId) => void tokens.delete(roomId),
    },
    telemetry: new ConnectionTelemetry(NO_REALTIME, { setRoomId: () => undefined }),
    persistentId: () => 'player-1',
    appVersion: () => 'test',
    random: () => 0.5,
  };
  return { deps, sockets, tokens };
}

export const LOBBY_STATE = { id: 'room-1', phase: 'LOBBY', players: [], currentTrick: null, completedTricks: [] };

/** A GameSession on the fake transport with a listener that records what it reports. */
export function setupSession() {
  const { deps, sockets, tokens } = fakeSessionDeps();
  const statuses: ConnectionStatus[] = [];
  const events: Array<{ type: string }> = [];
  const settled: Array<{ requestId: string; outcome: string; code?: string }> = [];
  const roomChanges: string[] = [];
  const session = new GameSession(deps);
  const listener: GameSessionListener = {
    onStatus: (status) => statuses.push(status),
    onEvent: (event) => events.push(event),
    onCommandSettled: (entry, outcome, error) => settled.push({ requestId: entry.requestId, outcome, code: error?.code }),
    onNotice: () => undefined,
    onRoomChanged: () => roomChanges.push(session.roomId ?? ''),
    joinFields: () => ({}),
    currentState: () => null,
  };
  session.setListener(listener);
  const connect = (roomId = 'room-1') => session.connect({ host: 'localhost', roomId, playerName: 'Merlin' });
  /** The socket opens and the server answers the join with the lobby. */
  const join = (socket: FakeSocket, extra: Record<string, unknown> = {}) => {
    socket.open();
    socket.receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'player-1', state: LOBBY_STATE, ...extra });
  };
  return { session, sockets, tokens, statuses, events, settled, roomChanges, connect, join };
}
