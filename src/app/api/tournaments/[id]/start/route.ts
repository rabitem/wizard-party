import { tournamentRoute } from '../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Host starts the tournament now: seeds the field and seats round 1. */
export const POST = tournamentRoute<{ id: string }>('POST /api/tournaments/[id]/start', async ({ user, tournaments }, { id }) =>
  Response.json(await tournaments.start.execute(user.id, id))
);
