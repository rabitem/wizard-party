import { tournamentSecret } from '@/infrastructure/tournament/tournament-config';
import { getTournamentServices } from '@/infrastructure/tournament/tournament-container';

import { handleMatchResultRequest, type MatchResultHandlerDeps } from './match-result-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/tournaments/match-results';

function log(level: 'info' | 'warn' | 'error', msg: string, fields: Record<string, unknown>): void {
  const line = `${JSON.stringify({ level, msg, route: ROUTE, ...fields })}\n`;
  (level === 'info' ? process.stdout : process.stderr).write(line);
}

const deps: MatchResultHandlerDeps = {
  secret: () => tournamentSecret(),
  // Created on first use: the container needs the database, which a misconfigured deployment lacks.
  record: { execute: (body) => getTournamentServices().recordMatchResult.execute(body) },
  progress: { execute: (body) => getTournamentServices().recordMatchProgress.execute(body) },
  log,
  now: Date.now,
};

/** Signed match results and progress pings from the game worker (no session; HMAC with TOURNAMENT_SECRET). */
export function POST(req: Request): Promise<Response> {
  return handleMatchResultRequest(req, deps);
}
