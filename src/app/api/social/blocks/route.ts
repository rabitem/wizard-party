import { accountRoute } from '@/app/api/account/account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = accountRoute('GET /api/social/blocks', async ({ user, social }) => Response.json({ players: await social.listBlocked.execute(user.id) }));
