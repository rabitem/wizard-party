import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Accounts seated in the room the player is in, for in-game "add friend". */
export const GET = accountRoute<{ roomCode: string }>('GET /api/social/rooms/[roomCode]/accounts', async ({ user, social }, { roomCode }) =>
  Response.json({ seats: await social.roomAccounts.execute(user.id, roomCode) })
);
