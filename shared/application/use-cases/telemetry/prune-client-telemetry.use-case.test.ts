import { describe, expect, it } from 'vitest';

import type { IClientTelemetryRetention } from '../../ports/client-telemetry-store.port';
import { PruneClientTelemetryUseCase } from './prune-client-telemetry.use-case';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function retention(events: number, sessions: number) {
  const remaining = { events, sessions };
  const calls: { cutoff: number; limit: number }[] = [];
  const store: IClientTelemetryRetention = {
    async deleteOlderThan(cutoff, limit) {
      calls.push({ cutoff, limit });
      const deleted = { events: Math.min(limit, remaining.events), sessions: Math.min(limit, remaining.sessions) };
      remaining.events -= deleted.events;
      remaining.sessions -= deleted.sessions;
      return deleted;
    },
  };
  return { store, calls };
}

describe('PruneClientTelemetryUseCase', () => {
  it('deletes in bounded batches until nothing older than the retention period is left', async () => {
    const { store, calls } = retention(25, 3);
    const result = await new PruneClientTelemetryUseCase(store, { retentionDays: 90, batchSize: 10 }).execute(NOW);
    expect(result).toEqual({ cutoff: NOW - 90 * DAY_MS, deletedEvents: 25, deletedSessions: 3, incomplete: false });
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => call.cutoff === NOW - 90 * DAY_MS && call.limit === 10)).toBe(true);
  });

  it('stops at the batch limit and reports the run as incomplete', async () => {
    const { store, calls } = retention(100, 0);
    const result = await new PruneClientTelemetryUseCase(store, { batchSize: 10, maxBatches: 2 }).execute(NOW);
    expect(result).toMatchObject({ deletedEvents: 20, incomplete: true });
    expect(calls).toHaveLength(2);
  });
});
