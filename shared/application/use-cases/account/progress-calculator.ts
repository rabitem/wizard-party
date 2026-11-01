import {
  aggregateStats,
  findNewlyUnlocked,
  getAchievementStatuses,
  getProgression,
  type AchievementContext,
  type AchievementStatus,
  type PlayerStatsSummary,
  type Progression,
} from '../../../domain/account';
import { tournamentAwardXp } from '../../../domain/tournament/participation';
import type { IClock, IGameResultRepository, IPlayerProgressRepository, ITournamentParticipationReader } from '../../ports/account';

export interface PlayerProgressView {
  stats: PlayerStatsSummary;
  progression: Progression;
  achievements: AchievementStatus[];
  newlyUnlocked: string[];
}

/**
 * Derives stats, XP and achievements from the full history (game results plus completed
 * tournaments). Recomputing from scratch keeps concurrent writers (two tabs, retries, a tournament
 * completing meanwhile) correct without locking: every run converges on the same answer.
 */
export class ProgressCalculator {
  constructor(
    private readonly results: IGameResultRepository,
    private readonly progress: IPlayerProgressRepository,
    private readonly tournaments: ITournamentParticipationReader,
    private readonly clock: IClock
  ) {}

  async compute(userId: string, { persist }: { persist: boolean }): Promise<PlayerProgressView> {
    const [state, results, tournaments] = await Promise.all([
      this.progress.get(userId),
      this.results.listAll(userId),
      this.tournaments.participations(userId),
    ]);
    const stats = aggregateStats(state.baseline, results);
    const gameXp = results.reduce((sum, result) => sum + result.xp, 0);
    const totalXp = state.baselineXp + gameXp + tournamentAwardXp(tournaments);
    const context: AchievementContext = { stats, results, tournaments };

    const newlyUnlocked = findNewlyUnlocked(context, new Set(state.unlocked.keys())).map((a) => a.id);
    const unlocked = new Map(state.unlocked);
    if (persist) {
      const now = this.clock.now();
      if (newlyUnlocked.length > 0) await this.progress.unlock(userId, newlyUnlocked, now);
      for (const id of newlyUnlocked) unlocked.set(id, now);
      await this.progress.saveSnapshot(userId, stats, totalXp);
    }

    return {
      stats,
      progression: getProgression(totalXp),
      achievements: getAchievementStatuses(context, unlocked),
      newlyUnlocked: persist ? newlyUnlocked : [],
    };
  }
}

/** Players recomputed at once by PlayerProgressRefresher; bounds the database fan-out. */
export const PROGRESS_REFRESH_CONCURRENCY = 4;

/**
 * Recomputes and persists the progress of several players, e.g. everyone involved in a tournament
 * that just completed (it satisfies IProgressRefresher of the tournament ports). One player's
 * failure does not stop the others; all failures are rethrown together afterwards.
 */
export class PlayerProgressRefresher {
  constructor(
    private readonly calculator: Pick<ProgressCalculator, 'compute'>,
    private readonly concurrency: number = PROGRESS_REFRESH_CONCURRENCY
  ) {}

  async refresh(userIds: readonly string[]): Promise<void> {
    const unique = [...new Set(userIds)];
    const failures: unknown[] = [];
    const batchSize = Math.max(1, this.concurrency);
    for (let start = 0; start < unique.length; start += batchSize) {
      const batch = unique.slice(start, start + batchSize);
      const settled = await Promise.allSettled(batch.map((userId) => this.calculator.compute(userId, { persist: true })));
      for (const outcome of settled) if (outcome.status === 'rejected') failures.push(outcome.reason);
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, `Progress refresh failed for ${failures.length} of ${unique.length} players.`);
    }
  }
}
