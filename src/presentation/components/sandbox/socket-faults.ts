import type { GameSocket, GameSocketFactory } from '../../hooks/connection/game-socket';
import { SOCKET_OPEN } from '../../hooks/connection/socket-command';
import type { FaultableSocket } from './sandbox.types';

function isFaultable(socket: GameSocket): socket is GameSocket & FaultableSocket {
  const candidate = socket as Partial<FaultableSocket>;
  return typeof candidate.closeFromServer === 'function' &&
    typeof candidate.failToConnect === 'function' &&
    typeof candidate.injectServerMessage === 'function';
}

/**
 * Transport faults at the client's socket: a server-side close with any code, an offline network
 * (every connection attempt fails until it is back) and raw server messages injected out of band.
 * It wraps the run's socket factory, so it always holds the socket the client is using now.
 */
export class SocketFaults {
  private current: (GameSocket & FaultableSocket) | null = null;
  private offline = false;

  constructor(private readonly onConnectionAttempt: () => void = () => undefined) {}

  wrap(factory: GameSocketFactory): GameSocketFactory {
    return (options) => {
      this.onConnectionAttempt();
      const socket = factory(options);
      this.current = isFaultable(socket) ? socket : null;
      if (this.offline) this.current?.failToConnect();
      return socket;
    };
  }

  /** False when the sockets in use cannot be driven (not the loopback socket). */
  get supported(): boolean {
    return this.current !== null;
  }

  /** The server closes the client's socket with `code` (4000: superseded by a newer connection). */
  closeFromServer(code: number, reason: string): boolean {
    if (!this.current) return false;
    this.current.closeFromServer(code, reason);
    return true;
  }

  /** Every connection attempt fails until online again. The open socket is dropped by the caller (server side). */
  setOffline(offline: boolean): void {
    this.offline = offline;
  }

  /** Delivers `messages` to the client now, in order. Returns how many reached an open socket. */
  inject(messages: readonly object[]): number {
    const socket = this.current;
    let delivered = 0;
    for (const message of messages) {
      // A socket that is still connecting or already closed drops what it is handed.
      if (socket?.readyState !== SOCKET_OPEN) break;
      socket.injectServerMessage(JSON.stringify(message));
      delivered++;
    }
    return delivered;
  }

  reset(): void {
    this.current = null;
    this.offline = false;
  }
}
