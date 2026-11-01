import { accountRoute, readJson } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Friends with live presence plus incoming and outgoing requests. */
export const GET = accountRoute('GET /api/social/friends', async ({ user, social }) => Response.json(await social.friends.execute(user.id)));

/** Sends a friend request by `username` or `userId` (accepts theirs if they already asked). */
export const POST = accountRoute('POST /api/social/friends', async ({ req, user, social }) =>
  Response.json(await social.sendFriendRequest.execute(user.id, await readJson(req, 1024)))
);
