import { getTournamentServices } from '@/infrastructure/tournament/tournament-container';

import { accountRoute } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Downloads everything stored about the player as JSON. */
export const GET = accountRoute('GET /api/account/export', async ({ user, services, social }) => {
  const account = services.exportAccountData.execute(user.id, {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    username: user.username,
    displayUsername: user.displayUsername,
    usernameChangedAt: user.usernameChangedAt ?? null,
  });
  const [data, socialData, tournamentData] = await Promise.all([
    account,
    social.exportSocialData.execute(user.id),
    getTournamentServices().exportData.execute(user.id),
  ]);
  data.social = socialData;
  data.tournaments = tournamentData;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="wizard-party-account-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
