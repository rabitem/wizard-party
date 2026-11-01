import { TOURNAMENT_INFRASTRUCTURE } from '@/infrastructure/tournament/tournament-config';

import { PRIVATE_NO_STORE, inviteCodeOf, readJsonObject } from '../tournament-http';
import { publicTournamentRoute, tournamentRoute } from '../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Viewer-aware detail (guests welcome): tournament, entrants, rounds, standings, awards and what the
 * viewer may do. Private tournaments need the host, an entry or `?code=`; otherwise 404. Polled by
 * the page, and every read applies due transitions (auto-start, timeouts).
 */
export const GET = publicTournamentRoute<{ id: string }>('GET /api/tournaments/[id]', { session: true }, async ({ req, viewer, tournaments }, { id }) =>
  Response.json(await tournaments.get.execute(viewer?.id ?? null, id, inviteCodeOf(req.url)), {
    headers: { 'Cache-Control': PRIVATE_NO_STORE },
  })
);

/** Host edits while registration is open; only the fields present change. */
export const PATCH = tournamentRoute<{ id: string }>('PATCH /api/tournaments/[id]', async ({ req, user, tournaments }, { id }) => {
  const input = await readJsonObject(req, { maxBytes: TOURNAMENT_INFRASTRUCTURE.MAX_REQUEST_BODY_BYTES });
  return Response.json(await tournaments.update.execute(user.id, id, input));
});
