import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = accountRoute<{ userId: string }>('PUT /api/social/friends/[userId]/pin', async ({ user, social }, { userId }) => {
  await social.setFriendPinned.execute(user.id, userId, true);
  return new Response(null, { status: 204 });
});

export const DELETE = accountRoute<{ userId: string }>('DELETE /api/social/friends/[userId]/pin', async ({ user, social }, { userId }) => {
  await social.setFriendPinned.execute(user.id, userId, false);
  return new Response(null, { status: 204 });
});
