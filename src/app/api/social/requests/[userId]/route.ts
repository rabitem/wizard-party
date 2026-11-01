import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Answers the request `userId` sent to the player: { accept: boolean }. */
export const PUT = accountRoute<{ userId: string }>('PUT /api/social/requests/[userId]', async ({ req, user, social }, { userId }) => {
  const { accept } = await readJson(req, 256);
  await social.respondToFriendRequest.execute(user.id, userId, accept === true);
  return new Response(null, { status: 204 });
});

/** Withdraws the player's own request to `userId`. */
export const DELETE = accountRoute<{ userId: string }>('DELETE /api/social/requests/[userId]', async ({ user, social }, { userId }) => {
  await social.cancelFriendRequest.execute(user.id, userId);
  return new Response(null, { status: 204 });
});
