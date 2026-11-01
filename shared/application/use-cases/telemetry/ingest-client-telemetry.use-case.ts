import {
  CLIENT_TELEMETRY_BUDGETS,
  type AnyClientTelemetryEnvelope,
  type ClientTelemetryIngestContext,
} from '../../../telemetry';
import type { IClientTelemetryStore } from '../../ports/client-telemetry-store.port';
import type { IUsageCounter } from '../../ports/usage-counter.port';

export interface IngestClientTelemetryInput {
  events: readonly AnyClientTelemetryEnvelope[];
  context: ClientTelemetryIngestContext;
}

export interface IngestClientTelemetryOutput {
  received: number;
  inserted: number;
  duplicates: number;
  /** Valid events not stored because a session or the daily budget was exhausted. */
  throttled: number;
}

export interface ClientTelemetryVolumeBudget {
  counter: IUsageCounter;
  maxEventsPerSessionPerDay?: number;
  maxEventsPerDay?: number;
}

const DAY_SECONDS = 24 * 60 * 60;
const DAY_MS = DAY_SECONDS * 1000;
const KEY_PREFIX = 'budget:client-telemetry';

/** Part of `amount` that fits under `limit`, given the counter total after adding `amount`. */
function granted(total: number | null, amount: number, limit: number): number {
  if (total === null) return amount; // Counter unavailable: fail open.
  return Math.max(0, Math.min(amount, limit - (total - amount)));
}

/**
 * Stores a validated browser batch. A tab may resend events (e.g. a beacon that was delivered but
 * reported as failed), so the store deduplicates by eventId and the session projection is idempotent.
 *
 * Stored volume is budgeted per tab session and globally per UTC day: event and session ids are
 * client-chosen, so idempotency alone does not bound what a forged client can make us store.
 */
export class IngestClientTelemetryUseCase {
  private readonly maxPerSession: number;
  private readonly maxPerDay: number;

  constructor(
    private readonly store: IClientTelemetryStore,
    private readonly budget: ClientTelemetryVolumeBudget | null = null
  ) {
    this.maxPerSession = budget?.maxEventsPerSessionPerDay ?? CLIENT_TELEMETRY_BUDGETS.MAX_EVENTS_PER_SESSION_PER_DAY;
    this.maxPerDay = budget?.maxEventsPerDay ?? CLIENT_TELEMETRY_BUDGETS.MAX_EVENTS_PER_DAY;
  }

  async execute({ events, context }: IngestClientTelemetryInput): Promise<IngestClientTelemetryOutput> {
    if (events.length === 0) return { received: 0, inserted: 0, duplicates: 0, throttled: 0 };

    const unique = [...new Map(events.map((event) => [event.eventId, event])).values()].sort(
      (a, b) => a.occurredAt - b.occurredAt
    );
    const admitted = await this.withinBudget(unique, context.receivedAt);
    const throttled = unique.length - admitted.length;
    const inBatchDuplicates = events.length - unique.length;
    if (admitted.length === 0) return { received: events.length, inserted: 0, duplicates: inBatchDuplicates, throttled };

    const { inserted } = await this.store.append(admitted, context);
    return { received: events.length, inserted, duplicates: admitted.length - inserted + inBatchDuplicates, throttled };
  }

  private async withinBudget(
    events: AnyClientTelemetryEnvelope[],
    receivedAt: number
  ): Promise<AnyClientTelemetryEnvelope[]> {
    if (!this.budget) return events;
    const { counter } = this.budget;
    const day = Math.floor(receivedAt / DAY_MS);

    const bySession = new Map<string, AnyClientTelemetryEnvelope[]>();
    for (const event of events) {
      const group = bySession.get(event.sessionId);
      if (group) group.push(event);
      else bySession.set(event.sessionId, [event]);
    }

    const perSession = await Promise.all(
      [...bySession].map(async ([sessionId, group]) => {
        const total = await counter.add(`${KEY_PREFIX}:session:${sessionId}:${day}`, group.length, DAY_SECONDS);
        return group.slice(0, granted(total, group.length, this.maxPerSession));
      })
    );
    const admitted = perSession.flat().sort((a, b) => a.occurredAt - b.occurredAt);
    if (admitted.length === 0) return admitted;

    const total = await counter.add(`${KEY_PREFIX}:day:${day}`, admitted.length, DAY_SECONDS);
    return admitted.slice(0, granted(total, admitted.length, this.maxPerDay));
  }
}
