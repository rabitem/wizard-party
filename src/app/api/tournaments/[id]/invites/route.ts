import { TOURNAMENT_INFRASTRUCTURE } from '@/infrastructure/tournament/tournament-config';

import { readJsonObject } from '../../tournament-http';
import { tournamentRoute } from '../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Host invites friends by `{ userIds }` (inbox item with a Register action). Answers who was
 * invited and who was skipped (blocks, invite policy, already registered, rate limits).
 */
export const POST = tournamentRoute<{ id: string }>('POST /api/tournaments/[id]/invites', async ({ req, user, tournaments }, { id }) => {
  const { userIds } = await readJsonObject(req, { maxBytes: TOURNAMENT_INFRASTRUCTURE.MAX_ACTION_BODY_BYTES });
  return Response.json(await tournaments.invite.execute(user.id, id, { userIds }));
});
