import type { GameSocket } from '@/presentation/hooks/connection/game-socket';
import type { FaultableSocket } from '@/presentation/components/sandbox/sandbox.types';

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

/** WebSocket close codes the loopback uses for faults it simulates. */
const LOOPBACK_CLOSE_CODES = {
  CLIENT_CLOSED: 1000,
  /** Abnormal closure: the network dropped the connection, no close frame. */
  CONNECTION_LOST: 1006,
} as const;

type ListenerMap = {
  open: Set<() => void>;
  message: Set<(event: MessageEvent) => void>;
  close: Set<(event: CloseEvent) => void>;
  error: Set<(event: Event) => void>;
};

export interface LoopbackSocketHandlers {
  onClientMessage: (socket: LoopbackSocket, message: string) => void;
  onClientClose: (socket: LoopbackSocket) => void;
}

/**
 * In-memory GameSocket. Messages from the client go straight to the sandbox server;
 * the server pushes events back through `deliver`. Open and close are asynchronous,
 * like a real WebSocket, so connection lifecycle code runs the same paths.
 *
 * It also implements the sandbox's fault port: server-initiated closes with any code,
 * connection attempts that fail before opening, and raw message injection.
 */
export class LoopbackSocket implements GameSocket, FaultableSocket {
  private state = CONNECTING;
  private readonly listeners: ListenerMap = {
    open: new Set(),
    message: new Set(),
    close: new Set(),
    error: new Set(),
  };

  constructor(private readonly handlers: LoopbackSocketHandlers) {
    setTimeout(() => {
      if (this.state !== CONNECTING) return;
      this.state = OPEN;
      for (const listener of [...this.listeners.open]) listener();
    }, 0);
  }

  get readyState(): number {
    return this.state;
  }

  get isOpen(): boolean {
    return this.state === OPEN;
  }

  send(message: string): void {
    if (this.state !== OPEN) throw new Error('LoopbackSocket is not open');
    this.handlers.onClientMessage(this, message);
  }

  close(): void {
    this.terminate(LOOPBACK_CLOSE_CODES.CLIENT_CLOSED, 'client closed', true);
  }

  /** Server-side drop, e.g. a simulated network loss. */
  drop(): void {
    this.terminate(LOOPBACK_CLOSE_CODES.CONNECTION_LOST, 'connection lost', false);
  }

  closeFromServer(code: number, reason: string): void {
    this.terminate(code, reason, true);
  }

  /**
   * Like a browser that cannot reach the host: an abnormal close, never `open`. The `error` event a
   * browser fires first is left out on purpose: the client only logs it, and the audit would count
   * that log as a code error rather than the network fault it is.
   */
  failToConnect(): void {
    this.terminate(LOOPBACK_CLOSE_CODES.CONNECTION_LOST, 'network unreachable', false);
  }

  injectServerMessage(data: string): void {
    this.deliver(data);
  }

  deliver(data: string): void {
    if (this.state !== OPEN) return;
    const event = new MessageEvent('message', { data });
    for (const listener of [...this.listeners.message]) listener(event);
  }

  addEventListener(type: keyof ListenerMap, listener: never): void {
    (this.listeners[type] as Set<unknown>).add(listener);
  }

  removeEventListener(type: keyof ListenerMap, listener: never): void {
    (this.listeners[type] as Set<unknown>).delete(listener);
  }

  private terminate(code: number, reason: string, wasClean: boolean): void {
    if (this.state === CLOSED) return;
    this.state = CLOSED;
    this.handlers.onClientClose(this);
    setTimeout(() => {
      const event = new CloseEvent('close', { code, reason, wasClean });
      for (const listener of [...this.listeners.close]) listener(event);
    }, 0);
  }
}
