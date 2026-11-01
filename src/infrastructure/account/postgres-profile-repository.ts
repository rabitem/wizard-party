import 'server-only';

import type { PlayerProfile, ProfileChanges } from '@shared/domain/account';
import type { IProfileRepository } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

interface ProfileRow {
  user_id: string;
  tagline: string;
  created_at: string | Date;
  is_public: boolean;
  show_history: boolean;
}

const toProfile = (row: ProfileRow): PlayerProfile => ({
  userId: row.user_id,
  tagline: row.tagline,
  createdAt: new Date(row.created_at).getTime(),
  isPublic: row.is_public,
  showHistory: row.show_history,
});

export class PostgresProfileRepository implements IProfileRepository {
  async get(userId: string): Promise<PlayerProfile | null> {
    const rows = (await getSql()`
      SELECT user_id, tagline, created_at, is_public, show_history
      FROM player_profiles WHERE user_id = ${userId}
    `) as ProfileRow[];
    return rows[0] ? toProfile(rows[0]) : null;
  }

  async ensure(profile: PlayerProfile): Promise<PlayerProfile> {
    const sql = getSql();
    const [, rows] = (await sql.transaction([
      sql`
        INSERT INTO player_profiles (user_id, tagline, created_at, is_public, show_history)
        VALUES (
          ${profile.userId}, ${profile.tagline}, to_timestamp(${profile.createdAt} / 1000.0),
          ${profile.isPublic}, ${profile.showHistory}
        )
        ON CONFLICT (user_id) DO NOTHING
      `,
      sql`
        SELECT user_id, tagline, created_at, is_public, show_history
        FROM player_profiles WHERE user_id = ${profile.userId}
      `,
    ])) as [unknown, ProfileRow[]];
    return toProfile(rows[0]);
  }

  async update(userId: string, changes: ProfileChanges): Promise<PlayerProfile> {
    const rows = (await getSql()`
      UPDATE player_profiles SET
        tagline = COALESCE(${changes.tagline ?? null}, tagline),
        is_public = COALESCE(${changes.isPublic ?? null}::boolean, is_public),
        show_history = COALESCE(${changes.showHistory ?? null}::boolean, show_history),
        updated_at = now()
      WHERE user_id = ${userId}
      RETURNING user_id, tagline, created_at, is_public, show_history
    `) as ProfileRow[];
    return toProfile(rows[0]);
  }
}
