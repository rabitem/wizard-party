import { accountRoute, readJson } from '../../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = accountRoute<{ id: string }>('PATCH /api/account/sounds/[id]', async ({ req, user, services }, { id }) => {
  await services.updateCustomSound.execute(user.id, id, await readJson(req));
  return new Response(null, { status: 204 });
});

export const DELETE = accountRoute<{ id: string }>('DELETE /api/account/sounds/[id]', async ({ user, services }, { id }) => {
  await services.deleteCustomSound.execute(user.id, id);
  return new Response(null, { status: 204 });
});
