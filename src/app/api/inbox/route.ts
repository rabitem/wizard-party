import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Newest first; pass the previous page's `nextCursor` as `cursor` to continue. */
export const GET = accountRoute('GET /api/inbox', async ({ req, user, social }) => {
  const cursor = new URL(req.url).searchParams.get('cursor');
  return Response.json(await social.listInbox.execute(user.id, cursor));
});
