import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';

import { normalizeUsername } from '@shared/domain/account/username';

import { publicProfilePath } from '@/presentation/components/account/public/public-profile-links';

/** Seconds a rendered /u/<username> page and its data stay fresh without an explicit purge. */
export const PUBLIC_PROFILE_REVALIDATE_SECONDS = 60;

/**
 * Cache tag of everything rendered from one handle's profile data. The page tags its data with
 * it, so purging the tag drops every cached URL variant of that handle (/u/Merlin, /u/merlin%20)
 * at once, not only the canonical path.
 */
export function publicProfileCacheTag(username: string): string {
  return `public-profile:${normalizeUsername(username)}`;
}

/**
 * /u/<username> is cached (ISR). After a change that is visible there (visibility, pins, profile
 * details, a rename or account deletion) drop the cached page so the next request renders fresh
 * data instead of a stale copy. Privacy relevant: switching a profile to private takes effect at
 * once. The tag is expired immediately (not stale-while-revalidate), so no request after the
 * purge sees the old page.
 */
export function revalidatePublicProfiles(usernames: readonly (string | null | undefined)[]): void {
  // The Hall of Champions shows the same public data (names, avatars, levels): purge it alongside.
  if (usernames.some(Boolean)) revalidateLeaderboards();
  for (const username of usernames) {
    if (!username) continue;
    try {
      revalidateTag(publicProfileCacheTag(username), { expire: 0 });
      revalidatePath(publicProfilePath(normalizeUsername(username)));
    } catch (error) {
      // Never fail the write because the page cache could not be purged; ISR expires it anyway.
      console.warn(JSON.stringify({ level: 'warn', msg: 'public_profile_revalidate_failed', error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

/** Seconds the public leaderboards stay cached when nothing purges them earlier. */
export const LEADERBOARD_REVALIDATE_SECONDS = 300;
export const LEADERBOARD_CACHE_TAG = 'leaderboards';

export function revalidateLeaderboards(): void {
  try {
    revalidateTag(LEADERBOARD_CACHE_TAG, { expire: 0 });
  } catch (error) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'leaderboard_revalidate_failed', error: error instanceof Error ? error.message : String(error) }));
  }
}
