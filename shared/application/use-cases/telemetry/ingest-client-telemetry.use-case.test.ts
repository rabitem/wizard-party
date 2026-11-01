import { describe, expect, it } from 'vitest';

import type { AnyClientTelemetryEnvelope, ClientTelemetryIngestContext } from '../../../telemetry';
import type { IClientTelemetryStore } from '../../ports/client-telemetry-store.port';
import type { IUsageCounter } from '../../ports/usage-counter.port';
import { IngestClientTelemetryUseCase } from './ingest-client-telemetry.use-case';

class InMemoryClientTelemetryStore implements IClientTelemetryStore {
  readonly events = new Map<string, AnyClientTelemetryEnvelope>();
  readonly calls: { events: readonly AnyClientTelemetryEnvelope[]; context: ClientTelemetryIngestContext }[] = [];

  async append(events: readonly AnyClientTelemetryEnvelope[], context: ClientTelemetryIngestContext) {
    this.calls.push({ events, context });
    let inserted = 0;
    for (const event of events) {
      if (!this.events.has(event.eventId)) {
        this.events.set(event.eventId, event);
        inserted++;
      }
    }
    return { inserted };
  }
}

const context: ClientTelemetryIngestContext = { receivedAt: 2, country: 'DE', userAgent: 'UA' };

const occurredAt = (e: AnyClientTelemetryEnvelope) => e.occurredAt;

class InMemoryCounter implements IUsageCounter {
  readonly totals = new Map<string, number>();
  available = true;

  async add(key: string, amount: number) {
    if (!this.available) return null;
    const total = (this.totals.get(key) ?? 0) + amount;
    this.totals.set(key, total);
    return total;
  }
}

function event(id: number, occurredAt: number, sessionId = '01900000-0000-7000-8000-0000000000aa'): AnyClientTelemetryEnvelope {
  return {
    eventId: `01900000-0000-7000-8000-${String(id).padStart(12, '0')}`,
    type: 'webgl.context',
    occurredAt,
    sessionId,
    playerId: null,
    roomId: null,
    page: '/',
    appVersion: 'dev',
    payload: { state: 'lost' },
  };
}

describe('IngestClientTelemetryUseCase', () => {
  it('stores events in occurrence order with the ingest context', async () => {
    const store = new InMemoryClientTelemetryStore();
    const result = await new IngestClientTelemetryUseCase(store).execute({ events: [event(2, 20), event(1, 10)], context });
    expect(result).toEqual({ received: 2, inserted: 2, duplicates: 0, throttled: 0 });
    expect(store.calls[0].events.map((e) => e.occurredAt)).toEqual([10, 20]);
    expect(store.calls[0].context).toBe(context);
  });

  it('deduplicates within a batch and reports replays as duplicates', async () => {
    const store = new InMemoryClientTelemetryStore();
    const ingest = new IngestClientTelemetryUseCase(store);
    await ingest.execute({ events: [event(1, 10)], context });
    const result = await ingest.execute({ events: [event(1, 10), event(1, 10), event(2, 20)], context });
    expect(store.calls[1].events).toHaveLength(2);
    expect(result).toEqual({ received: 3, inserted: 1, duplicates: 2, throttled: 0 });
  });

  it('does not touch the store for empty input', async () => {
    const store = new InMemoryClientTelemetryStore();
    const result = await new IngestClientTelemetryUseCase(store).execute({ events: [], context });
    expect(result).toEqual({ received: 0, inserted: 0, duplicates: 0, throttled: 0 });
    expect(store.calls).toHaveLength(0);
  });

  describe('volume budget', () => {
    const OTHER_SESSION = '01900000-0000-7000-8000-0000000000bb';

    it('caps stored events per session and day', async () => {
      const store = new InMemoryClientTelemetryStore();
      const counter = new InMemoryCounter();
      const ingest = new IngestClientTelemetryUseCase(store, { counter, maxEventsPerSessionPerDay: 3 });
      await ingest.execute({ events: [event(1, 1), event(2, 2)], context });
      const result = await ingest.execute({
        events: [event(3, 3), event(4, 4), event(5, 5, OTHER_SESSION)],
        context,
      });
      expect(result).toEqual({ received: 3, inserted: 2, duplicates: 0, throttled: 1 });
      const storedAt = store.calls[1].events.map(occurredAt);
      expect(storedAt).toEqual([3, 5]);
    });

    it('stops storing once the global daily budget is spent, without touching the store', async () => {
      const store = new InMemoryClientTelemetryStore();
      const ingest = new IngestClientTelemetryUseCase(store, { counter: new InMemoryCounter(), maxEventsPerDay: 2 });
      await ingest.execute({ events: [event(1, 1)], context });
      const partial = await ingest.execute({ events: [event(2, 2), event(3, 3)], context });
      expect(partial.throttled).toBe(1);
      const exhausted = await ingest.execute({ events: [event(4, 4)], context });
      expect(exhausted).toEqual({ received: 1, inserted: 0, duplicates: 0, throttled: 1 });
      expect(store.calls).toHaveLength(2);
    });

    it('starts a new budget on the next UTC day', async () => {
      const store = new InMemoryClientTelemetryStore();
      const ingest = new IngestClientTelemetryUseCase(store, { counter: new InMemoryCounter(), maxEventsPerSessionPerDay: 1 });
      await ingest.execute({ events: [event(1, 1)], context });
      expect((await ingest.execute({ events: [event(2, 2)], context })).throttled).toBe(1);
      const nextDay = { ...context, receivedAt: context.receivedAt + 24 * 60 * 60 * 1000 };
      expect((await ingest.execute({ events: [event(3, 3)], context: nextDay })).throttled).toBe(0);
    });

    it('fails open when the counter is unavailable', async () => {
      const counter = new InMemoryCounter();
      counter.available = false;
      const store = new InMemoryClientTelemetryStore();
      const ingest = new IngestClientTelemetryUseCase(store, { counter, maxEventsPerSessionPerDay: 0, maxEventsPerDay: 0 });
      expect((await ingest.execute({ events: [event(1, 1)], context })).inserted).toBe(1);
    });
  });
});
