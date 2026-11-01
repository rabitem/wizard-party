import 'server-only';

import { DEFAULT_PROFILE_VISIBILITY, completeStats, type LeaderboardCandidate, type PlayerStatsSummary } from '@shared/domain/account';
import type { ILeaderboardReader } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

interface CandidateRow {
  username: string;
  display_name: string;
  avatar: string | null;
  total_xp: number;
  summary: Partial<PlayerStatsSummary> | null;
}

export class PostgresLeaderboardReader implements ILeaderboardReader {
  async listPublicCandidates(limit: number): Promise<LeaderboardCandidate[]> {
    // Same visibility rule as /u/<username>: a public profile.
    const rows = (await getSql()`
      SELECT
        u."username" AS username,
        u."displayUsername" AS display_name,
        d.data ->> 'avatar' AS avatar,
        pr.total_xp,
        pr.summary
      FROM player_progress pr
      JOIN auth_users u ON u.id = pr.user_id
      LEFT JOIN player_profiles p ON p.user_id = u.id
      LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings'
      WHERE COALESCE(p.is_public, ${DEFAULT_PROFILE_VISIBILITY.isPublic}::boolean)
        AND pr.total_xp > 0
      ORDER BY pr.total_xp DESC
      LIMIT ${limit}
    `) as CandidateRow[];

    return rows.map((row) => ({
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar ?? 'wizard',
      totalXp: row.total_xp,
      stats: completeStats(row.summary),
    }));
  }
}
