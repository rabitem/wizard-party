import { CLIENT_TELEMETRY_BUDGETS } from '../../../telemetry';
import type { IClientTelemetryRetention } from '../../ports/client-telemetry-store.port';

export interface PruneClientTelemetryOutput {
  cutoff: number;
  deletedEvents: number;
  deletedSessions: number;
  /** True when the run stopped at its batch limit; the next run continues. */
  incomplete: boolean;
}

export interface PruneClientTelemetryOptions {
  retentionDays?: number;
  /** Rows per DELETE statement; keeps each statement (and its lock footprint) short. */
  batchSize?: number;
  /** Statements per run; bounds the run time of one scheduled invocation. */
  maxBatches?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_MAX_BATCHES = 20;

/** Enforces the retention period of browser telemetry (storage limitation). Idempotent; run daily. */
export class PruneClientTelemetryUseCase {
  private readonly retentionDays: number;
  private readonly batchSize: number;
  private readonly maxBatches: number;

  constructor(private readonly retention: IClientTelemetryRetention, options: PruneClientTelemetryOptions = {}) {
    this.retentionDays = options.retentionDays ?? CLIENT_TELEMETRY_BUDGETS.RETENTION_DAYS;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxBatches = options.maxBatches ?? DEFAULT_MAX_BATCHES;
  }

  async execute(now: number): Promise<PruneClientTelemetryOutput> {
    const cutoff = now - this.retentionDays * DAY_MS;
    let deletedEvents = 0;
    let deletedSessions = 0;
    for (let batch = 0; batch < this.maxBatches; batch++) {
      // Sequential on purpose: each batch is a separate short statement against the same rows.
      // eslint-disable-next-line no-await-in-loop
      const deleted = await this.retention.deleteOlderThan(cutoff, this.batchSize);
      deletedEvents += deleted.events;
      deletedSessions += deleted.sessions;
      if (deleted.events < this.batchSize && deleted.sessions < this.batchSize) {
        return { cutoff, deletedEvents, deletedSessions, incomplete: false };
      }
    }
    return { cutoff, deletedEvents, deletedSessions, incomplete: true };
  }
}
