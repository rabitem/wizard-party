import { unstable_cache } from 'next/cache';

import { getAccountServices } from '@/infrastructure/account/account-container';
import { LEADERBOARD_CACHE_TAG, LEADERBOARD_REVALIDATE_SECONDS } from '@/infrastructure/account/public-profile-cache';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Served from Next's data cache: the database is hit at most once per window, and privacy-relevant
// changes (profile made private, rename, deletion) purge the tag immediately.
const loadLeaderboards = unstable_cache(() => getAccountServices().getLeaderboards.execute(), ['leaderboards'], {
  tags: [LEADERBOARD_CACHE_TAG],
  revalidate: LEADERBOARD_REVALIDATE_SECONDS,
});

/** Public Hall of Champions: top players per category, only players with a public profile. */
export async function GET(): Promise<Response> {
  if (!isDatabaseConfigured()) return Response.json({ error: { code: 'unavailable' } }, { status: 503 });
  try {
    return Response.json({ boards: await loadLeaderboards() }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', msg: 'leaderboard_failed', error: error instanceof Error ? error.message : String(error) }));
    return Response.json({ error: { code: 'internal' } }, { status: 500 });
  }
}
