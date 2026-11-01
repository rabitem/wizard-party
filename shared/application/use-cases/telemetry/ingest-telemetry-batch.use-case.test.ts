import { describe, expect, it } from 'vitest';

import type { AnyTelemetryEnvelope, TelemetryBatch } from '../../../telemetry';
import type { ITelemetryEventStore } from '../../ports/telemetry-event-store.port';
import { IngestTelemetryBatchUseCase } from './ingest-telemetry-batch.use-case';

const T0 = 1_700_000_000_000;

/** Keeps every event once, like the database's unique key, in the order it arrived (what projections replay). */
class InMemoryTelemetryEventStore implements ITelemetryEventStore {
  readonly stored: AnyTelemetryEnvelope[] = [];

  async append(events: readonly AnyTelemetryEnvelope[]) {
    let inserted = 0;
    for (const event of events) {
      if (this.stored.some((stored) => stored.eventId === event.eventId)) continue;
      this.stored.push(event);
      inserted++;
    }
    return { inserted };
  }
}

const event = (roomId: string, seq: number): AnyTelemetryEnvelope => ({
  schemaVersion: 1,
  eventId: `${roomId}-${seq}`,
  type: 'player.left',
  occurredAt: T0 + seq,
  roomId,
  gameId: null,
  seq,
  source: 'system',
  actorId: null,
  correlationId: `corr-${roomId}-${seq}`,
  commandType: null,
  round: null,
  phase: 'LOBBY',
  serverVersion: null,
  payload: { playerId: 'p1' },
});

const batch = (...events: AnyTelemetryEnvelope[]): TelemetryBatch => ({ producer: 'worker', sentAt: T0, events });

describe('IngestTelemetryBatchUseCase', () => {
  it('should store each event once, in room and sequence order, and count what was already delivered', async () => {
    const store = new InMemoryTelemetryEventStore();
    const ingest = new IngestTelemetryBatchUseCase(store);
    await ingest.execute(batch(event('room-b', 1)));

    // At-least-once delivery: a retry repeats an event inside the batch and one sent before.
    const result = await ingest.execute(batch(event('room-b', 2), event('room-a', 2), event('room-a', 1), event('room-a', 1), event('room-b', 1)));

    expect(result).toEqual({ received: 5, inserted: 3, duplicates: 2 });
    expect(store.stored.map((stored) => stored.eventId)).toEqual(['room-b-1', 'room-a-1', 'room-a-2', 'room-b-2']);
  });
});
