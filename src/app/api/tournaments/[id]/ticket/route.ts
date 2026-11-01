import { tournamentRoute } from '../../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The signed match ticket for the viewer's pending table ({ matchId, roomCode, ticket, expiresAt,
 * label }). The browser hands it to the game worker with JOIN_GAME; the worker trusts nothing else.
 */
export const POST = tournamentRoute<{ id: string }>('POST /api/tournaments/[id]/ticket', async ({ user, tournaments }, { id }) =>
  Response.json(await tournaments.issueTicket.execute(user.id, id))
);
