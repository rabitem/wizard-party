import { unstable_cache } from 'next/cache';

import { getAccountServices } from '@/infrastructure/account/account-container';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVALIDATE_SECONDS = 60;

// At most one database round trip per minute, however many visitors load the home page.
const loadCommunityStats = unstable_cache(() => getAccountServices().getCommunityStats.execute(), ['community-stats'], {
  revalidate: REVALIDATE_SECONDS,
});

/** Public, aggregate-only counts for the home page ("realm pulse"). */
export async function GET(): Promise<Response> {
  if (!isDatabaseConfigured()) return Response.json({ error: { code: 'unavailable' } }, { status: 503 });
  try {
    return Response.json(await loadCommunityStats(), { headers: { 'Cache-Control': `public, max-age=${REVALIDATE_SECONDS}` } });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', msg: 'community_stats_failed', error: error instanceof Error ? error.message : String(error) }));
    return Response.json({ error: { code: 'internal' } }, { status: 500 });
  }
}
