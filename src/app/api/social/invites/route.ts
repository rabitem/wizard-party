import { accountRoute, readJson } from '@/app/api/account/account-route';
import { toSentInviteDto, type SentInvitesResponse } from '@/app/api/types/social-invites.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Invites the player sent to `?room=<roomCode>`, newest first (answered and expired ones included for a while). */
export const GET = accountRoute('GET /api/social/invites', async ({ req, user, social }) => {
  const invites = await social.listSentGameInvites.execute(user.id, new URL(req.url).searchParams.get('room'));
  return Response.json({ invites: invites.map(toSentInviteDto) } satisfies SentInvitesResponse);
});

/** Invites { userId } to the room { roomCode } the player is in. */
export const POST = accountRoute('POST /api/social/invites', async ({ req, user, social }) => {
  await social.sendGameInvite.execute(user.id, await readJson(req, 512));
  return new Response(null, { status: 204 });
});
