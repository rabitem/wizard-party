import { accountRoute, readJson } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One-time move of a browser's guest stats into the account. */
export const POST = accountRoute('POST /api/account/import', async ({ req, user, services }) => {
  const body = await readJson(req, 1024 * 1024);
  return Response.json(await services.importGuestProgress.execute(user.id, { stats: body.stats, history: body.history }));
});
