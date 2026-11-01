import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A player by handle with the signed-in player's relationship to them. */
export const GET = accountRoute<{ username: string }>('GET /api/social/players/[username]', async ({ user, social }, { username }) => {
  const player = await social.playerForViewer.execute(user.id, username);
  return player ? Response.json({ player }) : Response.json({ error: { code: 'not_found', message: 'no such player' } }, { status: 404 });
});
