import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Invite and friend request policies plus the chosen online status. */
export const GET = accountRoute('GET /api/social/settings', async ({ user, social }) => Response.json(await social.getSettings.execute(user.id)));

export const PATCH = accountRoute('PATCH /api/social/settings', async ({ req, identity, social }) =>
  Response.json(await social.updateSettings.execute(identity, await readJson(req, 512)))
);
