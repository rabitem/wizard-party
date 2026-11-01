import 'server-only';

import { accountRoute, type AccountRequestContext } from '@/app/api/account/account-route';
import { getSessionUser, type SessionUser } from '@/infrastructure/auth/auth';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { isTournamentsAvailable } from '@/infrastructure/tournament/tournament-config';
import { getTournamentServices, type TournamentServices } from '@/infrastructure/tournament/tournament-container';

import { TOURNAMENTS_UNAVAILABLE_MESSAGE, isMutation, problem, tournamentProblem } from './tournament-http';

export interface TournamentRequestContext extends AccountRequestContext {
  readonly tournaments: TournamentServices;
}

/**
 * Session route of the tournament API: accountRoute() (authentication, CSRF origin check, account
 * and social error mapping) plus TournamentError mapping. Mutations answer 503 while tournaments
 * are unavailable (no TOURNAMENT_SECRET), so nothing starts that the game worker could not play.
 */
export function tournamentRoute<P = unknown>(name: string, handler: (context: TournamentRequestContext, params: P) => Promise<Response>) {
  return accountRoute<P>(name, async (context, params) => {
    if (isMutation(context.req.method) && !isTournamentsAvailable()) return problem(503, 'unavailable', TOURNAMENTS_UNAVAILABLE_MESSAGE);
    const tournamentContext: TournamentRequestContext = {
      req: context.req,
      user: context.user,
      identity: context.identity,
      services: context.services,
      get social() {
        return context.social;
      },
      get tournaments() {
        return getTournamentServices();
      },
    };
    try {
      return await handler(tournamentContext, params);
    } catch (error) {
      const response = tournamentProblem(error);
      if (response) return response;
      throw error;
    }
  });
}

export interface PublicTournamentContext {
  req: Request;
  /** The signed-in player, or null for guests (and for routes that don't resolve the session). */
  viewer: SessionUser | null;
  tournaments: TournamentServices;
}

/**
 * Public read of the tournament API (guests welcome). With `session` the viewer is resolved when
 * signed in, for viewer-aware answers; such responses must not be cached publicly.
 */
export function publicTournamentRoute<P = unknown>(
  name: string,
  options: { session: boolean },
  handler: (context: PublicTournamentContext, params: P) => Promise<Response>
) {
  return async (req: Request, routeContext: { params: Promise<P> }): Promise<Response> => {
    if (!isDatabaseConfigured()) return problem(503, 'unavailable', TOURNAMENTS_UNAVAILABLE_MESSAGE);
    try {
      const viewer = options.session ? await getSessionUser(req.headers) : null;
      return await handler({ req, viewer, tournaments: getTournamentServices() }, await routeContext.params);
    } catch (error) {
      const response = tournamentProblem(error);
      if (response) return response;
      console.error(JSON.stringify({ level: 'error', msg: 'tournament_route_failed', route: name, error: error instanceof Error ? error.message : String(error) }));
      return problem(500, 'internal', 'something went wrong');
    }
  };
}
