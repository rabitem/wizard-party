import 'server-only';

import { getSql } from '../db/neon';
import type { UsernameLookup } from './profile-cache-progress-refresher';

/** One round trip for a whole tournament field; usernames are NOT NULL since 0107_one_player_name. */
export const loadUsernames: UsernameLookup = async (userIds) => {
  if (userIds.length === 0) return [];
  const rows = (await getSql()`SELECT "username" FROM auth_users WHERE id = ANY(${[...userIds]}::text[])`) as { username: string }[];
  return rows.map((row) => row.username);
};
