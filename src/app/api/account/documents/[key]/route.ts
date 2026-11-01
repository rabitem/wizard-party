import { accountRoute, readJson } from '../../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Saves a settings document with optimistic concurrency; 409 carries the current version. */
export const PUT = accountRoute<{ key: string }>('PUT /api/account/documents/[key]', async ({ req, user, services }, { key }) => {
  const result = await services.saveDocument.execute(user.id, key, await readJson(req, 64 * 1024));
  return result.ok
    ? Response.json({ document: result.document })
    : Response.json({ error: { code: 'conflict' }, current: result.current }, { status: 409 });
});
