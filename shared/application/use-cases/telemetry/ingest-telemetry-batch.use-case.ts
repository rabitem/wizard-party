import type { TelemetryBatch } from '../../../telemetry';
import type { ITelemetryEventStore } from '../../ports/telemetry-event-store.port';

export interface IngestTelemetryBatchOutput {
  received: number;
  inserted: number;
  duplicates: number;
}

/**
 * Stores a producer batch. Delivery is at-least-once, so the same events may arrive repeatedly;
 * the store deduplicates by eventId and projections are idempotent.
 */
export class IngestTelemetryBatchUseCase {
  constructor(private readonly store: ITelemetryEventStore) {}

  async execute(batch: TelemetryBatch): Promise<IngestTelemetryBatchOutput> {
    // Producers send in sequence order already; sorting keeps projections correct for any caller.
    const events = [...new Map(batch.events.map((event) => [event.eventId, event])).values()].sort(
      (a, b) => a.roomId.localeCompare(b.roomId) || a.seq - b.seq
    );
    const { inserted } = await this.store.append(events);
    return { received: batch.events.length, inserted, duplicates: batch.events.length - inserted };
  }
}
