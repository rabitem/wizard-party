import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMatchResultRequest, type MatchProgressReport } from '@shared/tournament';

import { APP_ORIGIN, TICKET_SECRET, apiRequest, harness, NO_PARAMS, routeParams, signInAs, setUpApiHarness } from '../../api-test-support';
import * as registrationRoute from '../[id]/registration/route';
import * as startRoute from '../[id]/start/route';
import * as tournamentsRoute from '../route';
import { POST } from './route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', async () => (await import('../../api-test-support')).authModule());
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../../api-test-support')).accountContainerModule());
vi.mock('@/infrastructure/social/social-container', async () => (await import('../../api-test-support')).socialContainerModule());
vi.mock('@/infrastructure/tournament/tournament-container', async () => (await import('../../api-test-support')).tournamentContainerModule());

setUpApiHarness();

const ENDPOINT = `${APP_ORIGIN}/api/tournaments/match-results`;

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
});
