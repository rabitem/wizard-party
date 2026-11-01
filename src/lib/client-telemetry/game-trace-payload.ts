import type { ClientTelemetryPayloads } from '@shared/telemetry';

import type { GameTraceEntry } from '../game-trace';
import { sanitizeGameTracePayload } from '../game-trace-server';

/**
 * Maps a game trace entry to the persisted `game.trace` payload; the sanitizer keeps strings and
 * detail maps bounded.
 */
export function toGameTracePayload(entry: GameTraceEntry): ClientTelemetryPayloads['game.trace'] | null {
  const trace = sanitizeGameTracePayload(entry);
  if (!trace) return null;
  return {
    traceType: trace.type,
    severity: trace.severity,
    traceSessionId: trace.traceSessionId ?? null,
    eventType: trace.eventType ?? null,
    commandType: trace.commandType ?? null,
    requestId: trace.requestId ?? null,
    cardId: trace.cardId ?? null,
    lagMs: trace.lagMs ?? null,
    reason: trace.reason ?? null,
    details: trace.details ?? null,
  };
}
