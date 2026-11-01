import { accountRoute } from '../../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A signed ticket for the player's look, bound to the name they sit at tables with; the browser
 * sends it with JOIN_GAME. `503 unavailable` without CHARACTER_TICKET_SECRET.
 */
export const POST = accountRoute('POST /api/account/character/ticket', async ({ user, identity, services }) =>
  Response.json(await services.issueCharacterTicket.execute(identity, user.displayUsername))
);
