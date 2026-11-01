import { sanitizeGlobalStats, summarizeCompletedGame, type GlobalStats } from '../../../domain/stats/global-stats';
import { TelemetryEventType, type AnyTelemetryEnvelope } from '../../../telemetry';
import type { ICompletedGameFactsReader, IGlobalStatsStore } from '../../ports/stats/global-stats.port';

export class GetGlobalStatsUseCase {
  constructor(private readonly store: IGlobalStatsStore) {}

  /** Null when no store is configured. */
  async execute(): Promise<GlobalStats | null> {
    const raw = await this.store.read();
    return raw ? sanitizeGlobalStats(raw) : null;
  }
}

/**
 * Adds every game a telemetry batch completes to the global totals. Runs after the batch is
 * stored, so the game's earlier events (delivered in sequence order) are already readable.
 */
export class RecordCompletedGamesUseCase {
  constructor(
    private readonly games: ICompletedGameFactsReader,
    private readonly store: IGlobalStatsStore
  ) {}

  async execute(events: readonly AnyTelemetryEnvelope[]): Promise<{ recorded: number }> {
    const gameIds = new Set<string>();
    for (const event of events) {
      if (event.type === TelemetryEventType.GAME_COMPLETED && event.gameId) gameIds.add(event.gameId);
    }

    const outcomes = await Promise.all([...gameIds].map(async (gameId) => {
      const facts = await this.games.read(gameId);
      return facts !== null && this.store.record(gameId, summarizeCompletedGame(facts));
    }));
    return { recorded: outcomes.filter(Boolean).length };
  }
}
