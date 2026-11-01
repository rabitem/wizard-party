import type { TelemetryClientInfo } from '../../shared/telemetry';

/** What is remembered about an open WebSocket so its session and disconnect can be attributed. */
export interface ConnectionSession {
  connectionId: string;
  connectedAt: number;
  client: TelemetryClientInfo;
  /** Set once a JOIN_GAME on this connection succeeds; kept after the player mapping is gone. */
  playerId: string | null;
}

/**
 * Far above what a room legitimately holds (a few players plus reconnect overlap). Protects the
 * Durable Object's memory if close events are ever lost; the oldest sessions are evicted first.
 */
export const MAX_TRACKED_CONNECTIONS = 1_000;

/** Bounded in-memory registry of open connections, cleaned up on close. */
export class ConnectionTracker {
  private readonly sessions = new Map<string, ConnectionSession>();

  open(connectionId: string, client: TelemetryClientInfo, connectedAt: number): ConnectionSession {
    this.sessions.delete(connectionId);
    while (this.sessions.size >= MAX_TRACKED_CONNECTIONS) {
      const oldest = this.sessions.keys().next();
      if (oldest.done) break;
      this.sessions.delete(oldest.value);
    }
    const session: ConnectionSession = { connectionId, connectedAt, client, playerId: null };
    this.sessions.set(connectionId, session);
    return session;
  }

  get(connectionId: string): ConnectionSession | undefined {
    return this.sessions.get(connectionId);
  }

  attachPlayer(connectionId: string, playerId: string): ConnectionSession | undefined {
    const session = this.sessions.get(connectionId);
    if (session) session.playerId = playerId;
    return session;
  }

  /** Removes and returns the session. */
  close(connectionId: string): ConnectionSession | undefined {
    const session = this.sessions.get(connectionId);
    this.sessions.delete(connectionId);
    return session;
  }
}
