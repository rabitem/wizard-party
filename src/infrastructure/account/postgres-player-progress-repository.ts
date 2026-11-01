import 'server-only';

import { EMPTY_STATS, type PlayerStatsSummary } from '@shared/domain/account';
import type { IPlayerProgressRepository, PlayerProgressState } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

export class PostgresPlayerProgressRepository implements IPlayerProgressRepository {
  async get(userId: string): Promise<PlayerProgressState> {
    const sql = getSql();
    const [progressRows, achievementRows] = (await sql.transaction([
      sql`SELECT baseline, baseline_xp, baseline_imported_at FROM player_progress WHERE user_id = ${userId}`,
      sql`SELECT achievement_id, unlocked_at FROM player_achievements WHERE user_id = ${userId}`,
    ])) as [
      { baseline: PlayerStatsSummary | null; baseline_xp: number; baseline_imported_at: string | null }[],
      { achievement_id: string; unlocked_at: string }[],
    ];
    const progress = progressRows[0];
    return {
      baseline: progress?.baseline ? { ...EMPTY_STATS, ...progress.baseline } : EMPTY_STATS,
      baselineXp: progress?.baseline_xp ?? 0,
      baselineImportedAt: progress?.baseline_imported_at ? new Date(progress.baseline_imported_at).getTime() : null,
      unlocked: new Map(achievementRows.map((row) => [row.achievement_id, new Date(row.unlocked_at).getTime()])),
    };
  }

  async saveSnapshot(userId: string, summary: PlayerStatsSummary, totalXp: number): Promise<void> {
    await getSql()`
      INSERT INTO player_progress (user_id, summary, total_xp, updated_at)
      VALUES (${userId}, ${JSON.stringify(summary)}::jsonb, ${totalXp}, now())
      ON CONFLICT (user_id) DO UPDATE SET summary = EXCLUDED.summary, total_xp = EXCLUDED.total_xp, updated_at = now()
    `;
  }

  async setBaselineOnce(userId: string, baseline: PlayerStatsSummary, baselineXp: number): Promise<boolean> {
    const rows = (await getSql()`
      INSERT INTO player_progress (user_id, baseline, baseline_xp, baseline_imported_at)
      VALUES (${userId}, ${JSON.stringify(baseline)}::jsonb, ${baselineXp}, now())
      ON CONFLICT (user_id) DO UPDATE
        SET baseline = EXCLUDED.baseline, baseline_xp = EXCLUDED.baseline_xp, baseline_imported_at = now()
        WHERE player_progress.baseline_imported_at IS NULL
      RETURNING user_id
    `) as unknown[];
    return rows.length > 0;
  }

  async unlock(userId: string, achievementIds: readonly string[], unlockedAt: number): Promise<void> {
    if (achievementIds.length === 0) return;
    await getSql()`
      INSERT INTO player_achievements (user_id, achievement_id, unlocked_at)
      SELECT ${userId}, id, to_timestamp(${unlockedAt} / 1000.0) FROM unnest(${[...achievementIds]}::text[]) AS id
      ON CONFLICT DO NOTHING
    `;
  }
}
