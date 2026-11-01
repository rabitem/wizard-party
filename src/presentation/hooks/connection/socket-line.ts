import type { GameSocket, GameSocketFactory, GameSocketOptions } from './game-socket';
import { SOCKET_OPEN, sendSocketCommand } from './socket-command';

/** What happens on the current socket. Events of a socket that was replaced never arrive. */
export interface SocketLineEvents {
  onOpen(): void;
  onMessage(data: unknown): void;
  /** The current socket closed by itself (the line never reports sockets it retired). */
  onClose(event: CloseEvent): void;
  /** The current socket did not open within its connect timeout; it was retired. */
  onConnectTimeout(): void;
}

/**
 * The transport half of a game session: at most one live socket at a time, numbered by a
 * generation, with a connect watchdog. Replacing or closing a socket "retires" it: its listeners
 * stay until its own close event arrives, and that event is swallowed.
 */
export class SocketLine {
  private socket: GameSocket | null = null;
  private generationValue = 0;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly retired = new Set<GameSocket>();

  constructor(private readonly factory: GameSocketFactory, private readonly events: SocketLineEvents) {}

  /** Grows with every socket opened. */
  get generation(): number {
    return this.generationValue;
  }

  get hasSocket(): boolean {
    return this.socket !== null;
  }

  get isOpen(): boolean {
    return this.socket?.readyState === SOCKET_OPEN;
  }

  get readyState(): number | undefined {
    return this.socket?.readyState;
  }

  /** Retires the current socket and opens a new one. Throws when the transport cannot create it. */
  open(options: GameSocketOptions & { connectTimeoutMs: number }): void {
    this.retire();
    this.generationValue += 1;
    const socket = this.factory(options);
    this.socket = socket;
    this.bind(socket);
    // Transports that enforce no handshake timeout themselves still never hang here.
    this.connectTimer = setTimeout(() => this.connectTimedOut(socket), options.connectTimeoutMs);
  }

  /** Closes the current socket on purpose. True when there was one. */
  retire(): boolean {
    this.clearConnectTimer();
    const socket = this.socket;
    if (!socket) return false;
    this.socket = null;
    this.retired.add(socket);
    socket.close();
    return true;
  }

  /** Sends a command (with a requestId) on the open socket; false when it could not go out. */
  send(command: object): boolean {
    return sendSocketCommand(this.socket, command);
  }

  /** Sends a frame as is (JOIN_GAME carries no requestId). */
  sendRaw(message: object): void {
    this.socket?.send(JSON.stringify(message));
  }

  private bind(socket: GameSocket): void {
    const onOpen = () => {
      if (socket !== this.socket) return;
      this.clearConnectTimer();
      this.events.onOpen();
    };
    const onMessage = (event: MessageEvent) => {
      if (socket === this.socket) this.events.onMessage(event.data);
    };
    const onError = () => console.warn('[Connection] Socket error; the close that follows reconnects');
    const onClose = (event: CloseEvent) => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
      socket.removeEventListener('close', onClose);
      if (this.retired.delete(socket) || socket !== this.socket) return;
      this.socket = null;
      this.clearConnectTimer();
      this.events.onClose(event);
    };
    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
    socket.addEventListener('close', onClose);
  }

  private connectTimedOut(socket: GameSocket): void {
    this.connectTimer = null;
    if (socket !== this.socket || socket.readyState === SOCKET_OPEN) return;
    this.retire();
    this.events.onConnectTimeout();
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
  }
}
