import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Runs { action: 'accept' | 'decline' } on an actionable item (friend request, game invite, ...). */
export const POST = accountRoute<{ id: string }>('POST /api/inbox/[id]/actions', async ({ req, user, social }, { id }) => {
  const { action } = await readJson(req, 256);
  return Response.json(await social.performInboxAction.execute(user.id, id, action));
});
