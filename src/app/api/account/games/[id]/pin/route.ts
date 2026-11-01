import { revalidatePublicProfiles } from '@/infrastructure/account/public-profile-cache';

import { accountRoute } from '../../../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pins a game to the player's profile (idempotent). */
export const PUT = accountRoute<{ id: string }>('PUT /api/account/games/[id]/pin', async ({ user, services }, { id }) => {
  const pinned = await services.pinGame.execute(user.id, id);
  revalidatePublicProfiles([user.username]);
  return Response.json(pinned);
});

/** Removes the pin (idempotent). */
export const DELETE = accountRoute<{ id: string }>('DELETE /api/account/games/[id]/pin', async ({ user, services }, { id }) => {
  await services.unpinGame.execute(user.id, id);
  revalidatePublicProfiles([user.username]);
  return new Response(null, { status: 204 });
});
