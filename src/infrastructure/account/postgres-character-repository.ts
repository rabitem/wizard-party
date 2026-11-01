import 'server-only';

import type { ICharacterRepository } from '@shared/application/ports/account';
import type { CharacterAppearance } from '@shared/domain/character';

import { getSql } from '../db/neon';

/** player_profiles.appearance (migration 0110). The profile row exists: SaveCharacter ensures it. */
export class PostgresCharacterRepository implements ICharacterRepository {
  async get(userId: string): Promise<unknown | null> {
    const rows = (await getSql()`
      SELECT appearance FROM player_profiles WHERE user_id = ${userId}
    `) as { appearance: unknown | null }[];
    return rows[0]?.appearance ?? null;
  }

  async save(userId: string, appearance: CharacterAppearance): Promise<void> {
    await getSql()`
      UPDATE player_profiles SET appearance = ${JSON.stringify(appearance)}::jsonb, updated_at = now()
      WHERE user_id = ${userId}
    `;
  }
}
