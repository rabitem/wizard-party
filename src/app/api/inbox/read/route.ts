import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Marks { ids } or { all: true } read. */
export const POST = accountRoute('POST /api/inbox/read', async ({ req, user, social }) =>
  Response.json(await social.markInboxRead.execute(user.id, await readJson(req, 4096)))
);
