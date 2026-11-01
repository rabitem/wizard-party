import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revokes an open invite the player sent; 409 once it was answered or expired. */
export const DELETE = accountRoute<{ id: string }>('DELETE /api/social/invites/[id]', async ({ user, social }, { id }) => {
  await social.revokeGameInvite.execute(user.id, id);
  return new Response(null, { status: 204 });
});
