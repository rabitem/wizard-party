import type { TelemetryEventType, TelemetryPayloads } from '../../shared/telemetry';

/**
 * A telemetry fact before it gets its envelope (sequence, ids, cause, game context).
 *
 * Facts come from two places: domain events translated by telemetry-mapper, and server-side facts
 * without a domain event (connections, settings, rejected commands) recorded via GameTelemetry.record.
 */
export interface TelemetryFact<T extends TelemetryEventType = TelemetryEventType> {
  type: T;
  /** Overrides the cause's actor when the fact knows more precisely who acted. */
  actorId: string | null;
  payload: TelemetryPayloads[T];
}

export type AnyTelemetryFact = { [K in TelemetryEventType]: TelemetryFact<K> }[TelemetryEventType];

export function telemetryFact<T extends TelemetryEventType>(
  type: T,
  actorId: string | null,
  payload: TelemetryPayloads[T]
): TelemetryFact<T> {
  return { type, actorId, payload };
}
