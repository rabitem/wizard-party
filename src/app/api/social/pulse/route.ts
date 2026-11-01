import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Heartbeat: publishes the player's presence, returns friends' presence and the inbox summary. */
export const POST = accountRoute('POST /api/social/pulse', async ({ req, user, social }) =>
  Response.json(await social.pulse.execute(user.id, await readJson(req, 2048)))
);
