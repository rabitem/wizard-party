import { revalidatePublicProfiles } from '@/infrastructure/account/public-profile-cache';

import { accountRoute, readJson } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in player's character look and the parts they may wear. */
export const GET = accountRoute('GET /api/account/character', async ({ identity, services }) =>
  Response.json(await services.getCharacter.execute(identity))
);

/** Saves `{ appearance }`; locked parts and invalid combinations answer 422 with the reason. */
export const PUT = accountRoute('PUT /api/account/character', async ({ req, user, identity, services }) => {
  const character = await services.saveCharacter.execute(identity, await readJson(req, 4096));
  // The look shows on the public profile and the leaderboards.
  revalidatePublicProfiles([user.username]);
  return Response.json(character);
});
