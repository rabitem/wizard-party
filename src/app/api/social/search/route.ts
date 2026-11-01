import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = accountRoute('GET /api/social/search', async ({ req, user, social }) => {
  const query = new URL(req.url).searchParams.get('q');
  return Response.json({ players: await social.searchPlayers.execute(user.id, query) });
});
