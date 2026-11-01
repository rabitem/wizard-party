import { tournamentRoute } from '../../../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Host voids a table that has been stuck longer than MATCH_STALE_AFTER_MS (everyone forfeits). */
export const POST = tournamentRoute<{ id: string; matchId: string }>(
  'POST /api/tournaments/[id]/matches/[matchId]/resolve',
  async ({ user, tournaments }, { id, matchId }) => Response.json(await tournaments.resolveStaleMatch.execute(user.id, id, matchId))
);
