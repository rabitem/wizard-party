import { TOURNAMENT_INFRASTRUCTURE } from '@/infrastructure/tournament/tournament-config';

import { listQueryOf, readJsonObject } from './tournament-http';
import { publicTournamentRoute, tournamentRoute } from './tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public list by status (open | live | finished), keyset paginated with `cursor`. The first page
 * also carries the recent champions strip. Same answer for everyone, so it is CDN cached briefly.
 */
export const GET = publicTournamentRoute('GET /api/tournaments', { session: false }, async ({ req, tournaments }) => {
  const query = listQueryOf(req.url);
  const [page, recentChampions] = await Promise.all([
    tournaments.list.execute(query),
    query.cursor ? Promise.resolve(undefined) : tournaments.list.champions(),
  ]);
  return Response.json(recentChampions ? { ...page, recentChampions } : page, {
    headers: { 'Cache-Control': TOURNAMENT_INFRASTRUCTURE.LIST_CACHE_CONTROL },
  });
});

/** Creates a tournament hosted by the signed-in player (who also registers unless joinAsEntrant: false). */
export const POST = tournamentRoute('POST /api/tournaments', async ({ req, user, tournaments }) => {
  const input = await readJsonObject(req, { maxBytes: TOURNAMENT_INFRASTRUCTURE.MAX_REQUEST_BODY_BYTES });
  return Response.json(await tournaments.create.execute(user.id, input), { status: 201 });
});
