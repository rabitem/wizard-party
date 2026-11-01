import PartySocket from 'partysocket';

/**
 * Port for the realtime game transport.
 *
 * GameSession only needs this WebSocket-shaped surface, so the production
 * PartySocket and in-browser transports (the animation sandbox's loopback
 * server) are interchangeable.
 */
export interface GameSocket {
  readonly readyState: number;
  send(message: string): void;
  close(): void;
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  addEventListener(type: 'close', listener: (event: CloseEvent) => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(type: 'open', listener: () => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'close', listener: (event: CloseEvent) => void): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
}

export interface GameSocketOptions {
  host: string;
  room: string;
  query: Record<string, string>;
  /**
   * A socket that has not opened by then closes itself (a `close` event follows), so the session's
   * reconnect policy retries it. Transports without a handshake may ignore it; the session keeps a
   * watchdog with the same timeout for them.
   */
  connectTimeoutMs?: number;
}

export type GameSocketFactory = (options: GameSocketOptions) => GameSocket;

export const createPartyGameSocket: GameSocketFactory = ({ host, room, query, connectTimeoutMs }) =>
  new PartySocket({
    host,
    room,
    // The session owns retries (backoff with jitter, terminal close codes).
    maxRetries: 0,
    ...(connectTimeoutMs === undefined ? {} : { connectionTimeout: connectTimeoutMs }),
    query,
  });
