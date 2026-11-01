import { TELEMETRY_PAYLOAD_LIMITS, TelemetryEventType, boundedText } from '../../shared/telemetry';
import type { ConnectionSession } from './connection-tracker';
import { telemetryFact, type TelemetryFact } from './telemetry-fact';

/** How a WebSocket closed, as reported by the runtime. */
export interface ConnectionCloseInfo {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

/** partyserver takes connection ids from the client's `_pk` query parameter, so they are bounded. */
function boundedConnectionId(connectionId: string): string {
  return boundedText(connectionId, TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH) ?? '';
}

export function clientConnectedFact(
  session: ConnectionSession
): TelemetryFact<typeof TelemetryEventType.CLIENT_CONNECTED> {
  return telemetryFact(TelemetryEventType.CLIENT_CONNECTED, null, {
    connectionId: boundedConnectionId(session.connectionId),
    ...session.client,
  });
}

export function sessionStartedFact(
  session: ConnectionSession,
  playerId: string,
  isReconnect: boolean
): TelemetryFact<typeof TelemetryEventType.SESSION_STARTED> {
  // The raw User-Agent is not linked to the persistent player id; the parsed fields suffice.
  const { userAgent: _userAgent, ...device } = session.client;
  return telemetryFact(TelemetryEventType.SESSION_STARTED, playerId, {
    playerId,
    connectionId: boundedConnectionId(session.connectionId),
    isReconnect,
    ...device,
  });
}

/** `session` is undefined for connections opened before this server instance started. */
export function clientDisconnectedFact(
  connectionId: string,
  session: ConnectionSession | undefined,
  close: ConnectionCloseInfo,
  now: number
): TelemetryFact<typeof TelemetryEventType.CLIENT_DISCONNECTED> {
  const playerId = session?.playerId ?? null;
  return telemetryFact(TelemetryEventType.CLIENT_DISCONNECTED, playerId, {
    connectionId: boundedConnectionId(connectionId),
    playerId,
    durationMs: session ? Math.max(0, now - session.connectedAt) : null,
    closeCode: typeof close.code === 'number' && Number.isInteger(close.code) ? close.code : null,
    closeReason: boundedText(close.reason, TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH),
    wasClean: typeof close.wasClean === 'boolean' ? close.wasClean : null,
  });
}
