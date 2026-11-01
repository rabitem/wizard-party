import { TOURNAMENT_INFRASTRUCTURE } from '@/infrastructure/tournament/tournament-config';

import { readJsonObject } from '../../tournament-http';
import { tournamentRoute } from '../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Registers the signed-in player; private tournaments need `{ inviteCode }`. */
export const POST = tournamentRoute<{ id: string }>('POST /api/tournaments/[id]/registration', async ({ req, user, tournaments }, { id }) => {
  const { inviteCode } = await readJsonObject(req, { maxBytes: TOURNAMENT_INFRASTRUCTURE.MAX_ACTION_BODY_BYTES, optional: true });
  return Response.json(await tournaments.register.execute(user.id, id, { inviteCode }));
});

/** Withdraws the signed-in player while registration is open. */
export const DELETE = tournamentRoute<{ id: string }>('DELETE /api/tournaments/[id]/registration', async ({ user, tournaments }, { id }) =>
  Response.json(await tournaments.withdraw.execute(user.id, id))
);
