import { accountRoute, readJson } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Full game history, newest first: `?cursor=<nextCursor>&limit=<n>` -> { games, nextCursor, pinned? }. */
export const GET = accountRoute('GET /api/account/games', async ({ req, user, services }) => {
  const params = new URL(req.url).searchParams;
  const page = await services.listGameHistory.execute(user.id, {
    cursor: params.get('cursor') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });
  return Response.json(page);
});

/** Records finished games; replays of known games are ignored. */
export const POST = accountRoute('POST /api/account/games', async ({ req, user, services }) => {
  const body = await readJson(req);
  return Response.json(await services.recordGameResults.execute(user.id, body.results));
});
