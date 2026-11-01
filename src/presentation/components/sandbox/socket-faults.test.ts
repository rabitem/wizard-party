import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionCloseCode } from '@shared/domain';
import { LoopbackSocket } from '@/infrastructure/sandbox/loopback-socket';
import type { GameSocket, GameSocketOptions } from '../../hooks/connection/game-socket';
import { SocketFaults } from './socket-faults';

/** WebSocket close code 1006: the connection ended abnormally, without a close frame. */
const ABNORMAL_CLOSURE = 1006;

const OPTIONS: GameSocketOptions = { host: 'sandbox.local', room: 'sandbox', query: {} };

const loopbackSocket = () => new LoopbackSocket({ onClientMessage: () => undefined, onClientClose: () => undefined });

/** What the client sees on a socket: whether it opened, its close events and its messages. */
function observe(socket: GameSocket) {
  const seen = { opened: false, closes: [] as Array<{ code: number; wasClean: boolean }>, messages: [] as string[] };
  socket.addEventListener('open', () => {
    seen.opened = true;
  });
  socket.addEventListener('close', (event: CloseEvent) => {
    seen.closes.push({ code: event.code, wasClean: event.wasClean });
  });
  socket.addEventListener('message', (event: MessageEvent) => {
    seen.messages.push(String(event.data));
  });
  return seen;
}

describe('SocketFaults', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should track the socket the client uses now and count connection attempts', async () => {
    let attempts = 0;
    const faults = new SocketFaults(() => {
      attempts++;
    });
    const factory = faults.wrap(loopbackSocket);
    const first = observe(factory(OPTIONS));
    const second = observe(factory(OPTIONS));
    await vi.advanceTimersByTimeAsync(1);

    expect(attempts).toBe(2);
    expect(faults.closeFromServer(ConnectionCloseCode.SUPERSEDED, 'superseded')).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(first.closes).toEqual([]);
    expect(second.closes).toEqual([{ code: ConnectionCloseCode.SUPERSEDED, wasClean: true }]);
  });

  it('should fail every connection attempt while offline', async () => {
    const faults = new SocketFaults();
    const factory = faults.wrap(loopbackSocket);
    faults.setOffline(true);
    const offline = observe(factory(OPTIONS));
    faults.setOffline(false);
    const online = observe(factory(OPTIONS));
    await vi.advanceTimersByTimeAsync(1);

    expect(offline.opened).toBe(false);
    expect(offline.closes).toEqual([{ code: ABNORMAL_CLOSURE, wasClean: false }]);
    expect(online.opened).toBe(true);
    expect(online.closes).toEqual([]);
  });

  it('should inject serialised server messages into the current socket', async () => {
    const faults = new SocketFaults();
    const socket = observe(faults.wrap(loopbackSocket)(OPTIONS));
    await vi.advanceTimersByTimeAsync(1);

    expect(faults.inject([{ type: 'EMOTE' }])).toBe(1);
    expect(socket.messages).toEqual(['{"type":"EMOTE"}']);
  });

  it('should count no injected message for a socket that is not open', async () => {
    const faults = new SocketFaults();
    const socket = observe(faults.wrap(loopbackSocket)(OPTIONS));

    expect(faults.inject([{ type: 'EMOTE' }])).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    faults.closeFromServer(ConnectionCloseCode.SUPERSEDED, 'superseded');
    expect(faults.inject([{ type: 'EMOTE' }, { type: 'CHAT' }])).toBe(0);
    expect(socket.messages).toEqual([]);
  });

  it('should not drive sockets that do not implement the fault port', () => {
    const faults = new SocketFaults();
    const plain: GameSocket = { readyState: 0, send() {}, close() {}, addEventListener() {}, removeEventListener() {} };
    faults.wrap(() => plain)(OPTIONS);
    expect(faults.supported).toBe(false);
    expect(faults.closeFromServer(4000, 'superseded')).toBe(false);
    expect(faults.inject([{ type: 'EMOTE' }])).toBe(0);
  });
});
