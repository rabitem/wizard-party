import { SocialError } from '@shared/application/use-cases/friends';

import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { getSocialServices } from '@/infrastructure/social/social-container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** The caller's address for the rate limit; the throttle stores only a keyed hash of it. */
function visitorKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * GET /api/profiles/search?q=: public profiles by name, for anyone (the start page's search).
 * Answers `{ players: PublicPlayerCard[] }`; an empty list when accounts are not configured.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return Response.json({ players: [] }, { headers: NO_STORE });
  const query = new URL(request.url).searchParams.get('q');
  try {
    const players = await getSocialServices().searchPublicProfiles.execute(visitorKey(request), query);
    return Response.json({ players }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof SocialError && error.code === 'rate_limited') {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } });
    }
    throw error;
  }
}
