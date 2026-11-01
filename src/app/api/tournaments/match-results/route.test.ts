import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMatchResultRequest, type MatchProgressReport } from '@shared/tournament';

import { getSessionUser } from '@/infrastructure/auth/auth';

import { APP_ORIGIN, TICKET_SECRET, apiRequest, createApiHarness, NO_PARAMS, routeParams, sessionUser, type ApiHarness } from '../../api-test-support';
import * as registrationRoute from '../[id]/registration/route';
import * as startRoute from '../[id]/start/route';
import * as tournamentsRoute from '../route';
import { POST } from './route';

const app = vi.hoisted(() => ({ harness: null as ApiHarness | null }));
const harness = (): ApiHarness => {
  if (!app.harness) throw new Error('harness not set up');
  return app.harness;
};

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/account/account-container', () => ({ getAccountServices: () => harness().account.services }));
vi.mock('@/infrastructure/social/social-container', () => ({ getSocialServices: () => harness().social.services }));
vi.mock('@/infrastructure/tournament/tournament-container', () => ({ getTournamentServices: () => harness().tournaments.services }));

const ENDPOINT = `${APP_ORIGIN}/api/tournaments/match-results`;

function signInAs(username: string): void {
  vi.mocked(getSessionUser).mockResolvedValue(sessionUser(username));
}

/** A running tournament with one table, created through the session routes. */
async function runningTournament(): Promise<string> {
  signInAs('host');
  const created = await tournamentsRoute.POST(apiRequest('POST', '/api/tournaments', { json: { name: 'Spring Cup', joinAsEntrant: false, settings: { rounds: 2 } } }), NO_PARAMS);
  const id = ((await created.json()) as { tournament: { id: string } }).tournament.id;
  for (const entrant of ['u01', 'u02', 'u03']) {
    signInAs(entrant);
    // eslint-disable-next-line no-await-in-loop -- one session at a time
    await registrationRoute.POST(apiRequest('POST', `/api/tournaments/${id}/registration`), routeParams({ id }));
  }
  signInAs('host');
  await startRoute.POST(apiRequest('POST', `/api/tournaments/${id}/start`), routeParams({ id }));
  return id;
}

/** The progress ping the game worker sends for the tournament's first table. */
function progressPing(id: string): MatchProgressReport {
  const match = harness().tournamentRepo.rows.get(id)?.matches[0];
  if (!match) throw new Error('no table');
  return { v: 1, kind: 'progress', tid: id, mid: match.id, room: match.roomCode, gameId: `game-${match.id}`, round: 3, maxRounds: 20, at: harness().time.now };
}

/** A request exactly as the worker sends it, signed with `secret` now. */
async function signed(report: MatchProgressReport, secret: string): Promise<Request> {
  const request = await buildMatchResultRequest(secret, report, Date.now());
  return new Request(ENDPOINT, { method: 'POST', headers: request.headers, body: request.body });
}

beforeEach(() => {
  app.harness = createApiHarness();
  for (const id of ['host', 'u01', 'u02', 'u03']) harness().socialDb.addPlayer(id);
  // The route reads the wall clock (deps.now = Date.now) to check the signature's age; run the
  // app clock at that time too, so a report signed now is fresh for both.
  harness().time.now = Date.now();
  vi.stubEnv('TOURNAMENT_SECRET', TICKET_SECRET);
  // The route logs one JSON line per request.
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  app.harness = null;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/tournaments/match-results', () => {
  it('should record a progress ping signed with TOURNAMENT_SECRET on the running table', async () => {
    const id = await runningTournament();

    const response = await POST(await signed(progressPing(id), TICKET_SECRET));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'recorded' });
    expect(harness().tournamentRepo.rows.get(id)?.matches[0]).toMatchObject({ live: { round: 3, maxRounds: 20 } });
  });

  it('should refuse a report signed with any other key with 401 and record nothing', async () => {
    const id = await runningTournament();

    const response = await POST(await signed(progressPing(id), 'not-the-tournament-secret'));

    expect(response.status).toBe(401);
    expect(harness().tournamentRepo.rows.get(id)?.matches[0]?.live ?? null).toBeNull();
  });

  it('should answer 503 while TOURNAMENT_SECRET is not configured, so the worker retries later', async () => {
    const id = await runningTournament();
    vi.stubEnv('TOURNAMENT_SECRET', '');

    const response = await POST(await signed(progressPing(id), TICKET_SECRET));

    expect(response.status).toBe(503);
  });
});
