import { tournamentRoute } from '../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Host cancels a tournament that has not finished yet. */
export const POST = tournamentRoute<{ id: string }>('POST /api/tournaments/[id]/cancel', async ({ user, tournaments }, { id }) =>
  Response.json(await tournaments.cancel.execute(user.id, id))
);
