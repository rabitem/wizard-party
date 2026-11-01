import type { CompletedGameFacts, GameStatsContribution, GlobalStats } from '../../../domain/stats/global-stats';

/** Reads what the game server recorded about one completed game. */
export interface ICompletedGameFactsReader {
  /** Null when the game is unknown or not completed. */
  read(gameId: string): Promise<CompletedGameFacts | null>;
}

export interface IGlobalStatsStore {
  /** Null when no store is configured; implementations may return raw, unsanitized numbers. */
  read(): Promise<Partial<Record<keyof GlobalStats, unknown>> | null>;
  /**
   * Adds a game to the totals at most once per game id (results are delivered at least once).
   * Returns false when the game was already recorded or no store is configured.
   */
  record(gameId: string, contribution: GameStatsContribution): Promise<boolean>;
}
