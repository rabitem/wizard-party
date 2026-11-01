import 'server-only';

import type { CustomSoundAssignments, SoundCategory } from '@shared/domain';
import type { ICustomSoundRepository, StoredCustomSound } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

interface SoundRow {
  sound_id: string;
  name: string;
  url: string;
  storage_key: string;
  size_bytes: number;
  duration_seconds: number;
  category: string;
  roles: CustomSoundAssignments;
  created_at: string | Date;
}

const toSound = (row: SoundRow): StoredCustomSound => ({
  id: row.sound_id,
  name: row.name,
  url: row.url,
  storageKey: row.storage_key,
  size: row.size_bytes,
  duration: row.duration_seconds,
  category: row.category as SoundCategory,
  roles: row.roles,
  createdAt: new Date(row.created_at).getTime(),
});

export class PostgresCustomSoundRepository implements ICustomSoundRepository {
  async list(userId: string): Promise<StoredCustomSound[]> {
    const rows = (await getSql()`
      SELECT sound_id, name, url, storage_key, size_bytes, duration_seconds, category, roles, created_at
      FROM account_custom_sounds WHERE user_id = ${userId} ORDER BY created_at
    `) as SoundRow[];
    return rows.map(toSound);
  }

  async count(userId: string): Promise<number> {
    const rows = (await getSql()`SELECT count(*)::int AS n FROM account_custom_sounds WHERE user_id = ${userId}`) as { n: number }[];
    return rows[0]?.n ?? 0;
  }

  async upsert(userId: string, sound: StoredCustomSound): Promise<void> {
    await getSql()`
      INSERT INTO account_custom_sounds (user_id, sound_id, name, url, storage_key, size_bytes, duration_seconds, category, roles, created_at)
      VALUES (${userId}, ${sound.id}, ${sound.name}, ${sound.url}, ${sound.storageKey}, ${sound.size}, ${sound.duration},
              ${sound.category}, ${JSON.stringify(sound.roles)}::jsonb, to_timestamp(${sound.createdAt} / 1000.0))
      ON CONFLICT (user_id, sound_id) DO UPDATE SET
        name = EXCLUDED.name, url = EXCLUDED.url, storage_key = EXCLUDED.storage_key, size_bytes = EXCLUDED.size_bytes,
        duration_seconds = EXCLUDED.duration_seconds, category = EXCLUDED.category, roles = EXCLUDED.roles, updated_at = now()
    `;
  }

  async updateMetadata(
    userId: string,
    id: string,
    changes: Pick<StoredCustomSound, 'name' | 'category' | 'roles'>
  ): Promise<boolean> {
    const rows = (await getSql()`
      UPDATE account_custom_sounds
      SET name = ${changes.name}, category = ${changes.category}, roles = ${JSON.stringify(changes.roles)}::jsonb, updated_at = now()
      WHERE user_id = ${userId} AND sound_id = ${id}
      RETURNING sound_id
    `) as unknown[];
    return rows.length > 0;
  }

  async remove(userId: string, id: string): Promise<StoredCustomSound | null> {
    const rows = (await getSql()`
      DELETE FROM account_custom_sounds WHERE user_id = ${userId} AND sound_id = ${id}
      RETURNING sound_id, name, url, storage_key, size_bytes, duration_seconds, category, roles, created_at
    `) as SoundRow[];
    return rows[0] ? toSound(rows[0]) : null;
  }
}
