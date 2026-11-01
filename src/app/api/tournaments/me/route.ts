import { tournamentRoute } from '../tournament-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in player's upcoming, live and past tournaments plus their trophies. */
export const GET = tournamentRoute('GET /api/tournaments/me', async ({ user, tournaments }) =>
  Response.json(await tournaments.listMine.execute(user.id))
);
