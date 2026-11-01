import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = accountRoute<{ userId: string }>('PUT /api/social/blocks/[userId]', async ({ user, social }, { userId }) => {
  await social.blockPlayer.execute(user.id, userId);
  return new Response(null, { status: 204 });
});

export const DELETE = accountRoute<{ userId: string }>('DELETE /api/social/blocks/[userId]', async ({ user, social }, { userId }) => {
  await social.unblockPlayer.execute(user.id, userId);
  return new Response(null, { status: 204 });
});
