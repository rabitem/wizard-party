import type { AnyClientTelemetryEnvelope, ClientTelemetryIngestContext } from '../../telemetry';

export interface ClientTelemetryAppendResult {
  /** Events that were new; replays of already stored events are ignored. */
  inserted: number;
}

/** Durable, idempotent store for browser telemetry events and the per-session read model. */
export interface IClientTelemetryStore {
  append(
    events: readonly AnyClientTelemetryEnvelope[],
    context: ClientTelemetryIngestContext
  ): Promise<ClientTelemetryAppendResult>;
}

export interface ClientTelemetryDeleteResult {
  events: number;
  sessions: number;
}

/** Retention side of the client telemetry store (kept separate: ingest never deletes). */
export interface IClientTelemetryRetention {
  /** Deletes at most `limit` events and `limit` sessions older than `cutoff` (epoch ms). */
  deleteOlderThan(cutoff: number, limit: number): Promise<ClientTelemetryDeleteResult>;
}
