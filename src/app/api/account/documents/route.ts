import { accountRoute } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = accountRoute('GET /api/account/documents', async ({ user, services }) =>
  Response.json({ documents: await services.listDocuments.execute(user.id) })
);
