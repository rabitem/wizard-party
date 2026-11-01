import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = accountRoute<{ id: string }>('DELETE /api/inbox/[id]', async ({ user, social }, { id }) => {
  await social.dismissInboxItem.execute(user.id, id);
  return new Response(null, { status: 204 });
});
