import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = accountRoute<{ userId: string }>('DELETE /api/social/friends/[userId]', async ({ user, social }, { userId }) => {
  await social.removeFriend.execute(user.id, userId);
  return new Response(null, { status: 204 });
});
