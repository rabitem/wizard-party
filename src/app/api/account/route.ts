import { revalidatePublicProfiles } from '@/infrastructure/account/public-profile-cache';

import { accountRoute, readJson } from './account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Profile, stats, level, achievements and recent games of the signed-in player. */
export const GET = accountRoute('GET /api/account', async ({ identity, services }) =>
  Response.json(await services.getOverview.execute(identity))
);

export const PATCH = accountRoute('PATCH /api/account', async ({ req, user, identity, services }) => {
  const profile = await services.updateProfile.execute(identity, await readJson(req));
  revalidatePublicProfiles([user.username]);
  return Response.json({ profile });
});
