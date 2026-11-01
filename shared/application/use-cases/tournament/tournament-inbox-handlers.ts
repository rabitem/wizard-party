import type { InboxKind } from '../../../domain/social';
import { isTournamentError } from '../../../domain/tournament';
import { SocialError } from '../friends/social-error';
import type { InboxActionHandler } from '../inbox/inbox.use-cases';
import { tournamentPagePath } from '../../../tournament';
import type { RegisterForTournamentUseCase } from './tournament-registration.use-cases';

/**
 * How tournament items answer inbox actions; registered in the composition root next to
 * friendsInboxHandlers. Tournament errors are translated to SocialErrors so the inbox route keeps
 * its error mapping (not_found closes the item there).
 */
export function tournamentInboxHandlers(register: RegisterForTournamentUseCase): Partial<Record<InboxKind, InboxActionHandler>> {
  return {
    tournament_invite: async (userId, item, action) => {
      if (item.kind !== 'tournament_invite' || action !== 'accept') return {};
      const { tournamentId, inviteCode } = item.payload;
      try {
        await register.execute(userId, tournamentId, { inviteCode });
      } catch (error) {
        if (isTournamentError(error, 'already_registered')) return { navigateTo: tournamentPagePath(tournamentId) };
        if (isTournamentError(error, 'not_found')) throw new SocialError('not_found', 'This tournament no longer exists.');
        if (isTournamentError(error, 'rate_limited')) throw new SocialError('rate_limited', error.message);
        if (isTournamentError(error)) throw new SocialError('conflict', error.message);
        throw error;
      }
      return { navigateTo: tournamentPagePath(tournamentId) };
    },
    tournament_table_ready: async (_userId, item, action) => {
      if (item.kind !== 'tournament_table_ready' || action !== 'accept') return {};
      return { navigateTo: tournamentPagePath(item.payload.tournamentId, { join: true }) };
    },
  };
}
