import type { AnyTelemetryEnvelope } from '../../telemetry';

export interface TelemetryAppendResult {
  /** Events that were new; replays of already stored events are ignored. */
  inserted: number;
}

/** Durable, idempotent store for telemetry events and their read models. */
export interface ITelemetryEventStore {
  append(events: readonly AnyTelemetryEnvelope[]): Promise<TelemetryAppendResult>;
}
