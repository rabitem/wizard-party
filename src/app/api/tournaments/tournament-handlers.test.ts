import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOURNAMENT_TIMING } from '@shared/domain/tournament';

import { getSessionUser } from '@/infrastructure/auth/auth';
import { TOURNAMENT_INFRASTRUCTURE } from '@/infrastructure/tournament/tournament-config';

import { T0, TICKET_SECRET, apiRequest, errorOf, harness, NO_PARAMS, routeParams, signInAs, setUpApiHarness } from '../api-test-support';
import * as cancelRoute from './[id]/cancel/route';
import * as invitesRoute from './[id]/invites/route';
import * as resolveRoute from './[id]/matches/[matchId]/resolve/route';
import * as registrationRoute from './[id]/registration/route';
import * as tournamentRoute from './[id]/route';
import * as startRoute from './[id]/start/route';
import * as ticketRoute from './[id]/ticket/route';
import * as meRoute from './me/route';
import * as tournamentsRoute from './route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', async () => (await import('../api-test-support')).authModule());
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../api-test-support')).accountContainerModule());
vi.mock('@/infrastructure/social/social-container', async () => (await import('../api-test-support')).socialContainerModule());
vi.mock('@/infrastructure/tournament/tournament-container', async () => (await import('../api-test-support')).tournamentContainerModule());

setUpApiHarness();

const HOST = 'host';
const ENTRANTS = ['u01', 'u02', 'u03'];

interface DetailBody {
  tournament: { id: string; name: string; status: string; visibility: string; entrantCount: number; inviteCode: string | null };
  viewer: { userId: string | null; isHost: boolean; isEntrant: boolean };
  rounds: { matches: { id: string; status: string }[] }[];
}

async function create(body: Record<string, unknown>): Promise<Response> {
  signInAs(HOST);
  return tournamentsRoute.POST(apiRequest('POST', '/api/tournaments', { json: body }), NO_PARAMS);
}

async function createdId(body: Record<string, unknown> = {}): Promise<string> {
  const response = await create({ name: 'Spring Cup', joinAsEntrant: false, ...body });
  return ((await response.json()) as DetailBody).tournament.id;
}

async function register(username: string, id: string, init: { json?: unknown; body?: string } = {}): Promise<Response> {
  signInAs(username);
  return registrationRoute.POST(apiRequest('POST', `/api/tournaments/${id}/registration`, init), routeParams({ id }));
}

async function hostAction(route: { POST: typeof startRoute.POST }, action: string, id: string, as = HOST): Promise<Response> {
  signInAs(as);
  return route.POST(apiRequest('POST', `/api/tournaments/${id}/${action}`), routeParams({ id }));
}

async function startedWithEntrants(): Promise<string> {
  const id = await createdId({ settings: { rounds: 2 } });
  // eslint-disable-next-line no-await-in-loop -- one session at a time
  for (const entrant of ENTRANTS) await register(entrant, id);
  await hostAction(startRoute, 'start', id);
  return id;
}

async function detail(id: string, viewer: string | null, query = ''): Promise<Response> {
  signInAs(viewer);
  return tournamentRoute.GET(apiRequest('GET', `/api/tournaments/${id}${query}`), routeParams({ id }));
}

beforeEach(() => {
  vi.stubEnv('TOURNAMENT_SECRET', TICKET_SECRET);
  for (const id of [HOST, ...ENTRANTS, 'bob']) harness().socialDb.addPlayer(id);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/tournaments', () => {
  it('should create a tournament hosted and entered by the signed-in player and answer 201 with its detail', async () => {
    const response = await create({ name: 'Spring Cup' });

    expect(response.status).toBe(201);
    const body = (await response.json()) as DetailBody;
    expect(body.tournament).toMatchObject({ name: 'Spring Cup', status: 'registration', entrantCount: 1 });
    expect(body.viewer).toMatchObject({ userId: HOST, isHost: true, isEntrant: true });
    expect(harness().tournamentRepo.rows.get(body.tournament.id)?.name).toBe('Spring Cup');
  });

  it.each([
    ['a JSON array', '["Spring Cup"]'],
    ['a body over the create limit', JSON.stringify({ name: 'Spring Cup', description: 'x'.repeat(TOURNAMENT_INFRASTRUCTURE.MAX_REQUEST_BODY_BYTES) })],
  ])('should answer 422 to %s and create nothing', async (_label, body) => {
    signInAs(HOST);

    const response = await tournamentsRoute.POST(apiRequest('POST', '/api/tournaments', { body }), NO_PARAMS);

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input' });
    expect(harness().tournamentRepo.rows.size).toBe(0);
  });
});

describe('GET /api/tournaments', () => {
  it('should list open tournaments to guests, CDN cacheable, with the champions strip on the first page only', async () => {
    harness().time.now = T0;
    await createdId({ name: 'Older Cup' });
    harness().time.now = T0 + 1000;
    await createdId({ name: 'Newer Cup' });
    vi.mocked(getSessionUser).mockClear();

    const first = await tournamentsRoute.GET(apiRequest('GET', '/api/tournaments?status=open&limit=1'), NO_PARAMS);

    expect(first.headers.get('Cache-Control')).toBe(TOURNAMENT_INFRASTRUCTURE.LIST_CACHE_CONTROL);
    const firstPage = (await first.json()) as { items: { name: string }[]; nextCursor: string | null; recentChampions?: unknown[] };
    expect(firstPage.items.map((item) => item.name)).toEqual(['Newer Cup']);
    expect(firstPage.recentChampions).toEqual([]);
    // The list is the same for everyone: it never resolves a session.
    expect(getSessionUser).not.toHaveBeenCalled();

    const cursor = encodeURIComponent(firstPage.nextCursor ?? '');
    const second = await tournamentsRoute.GET(apiRequest('GET', `/api/tournaments?status=open&limit=1&cursor=${cursor}`), NO_PARAMS);
    const secondPage = (await second.json()) as { items: { name: string }[]; recentChampions?: unknown[] };
    expect(secondPage.items.map((item) => item.name)).toEqual(['Older Cup']);
    expect(secondPage).not.toHaveProperty('recentChampions');
  });

  it('should filter by the status in the query', async () => {
    await createdId();

    const response = await tournamentsRoute.GET(apiRequest('GET', '/api/tournaments?status=live'), NO_PARAMS);

    expect(((await response.json()) as { items: unknown[] }).items).toEqual([]);
  });
});

describe('GET, PATCH /api/tournaments/[id]', () => {
  it('should answer guests and players with their own viewer and never let the answer be cached publicly', async () => {
    const id = await createdId();

    const asGuest = await detail(id, null);
    const asHost = await detail(id, HOST);

    expect(asGuest.headers.get('Cache-Control')).toBe('private, no-store');
    expect(((await asGuest.json()) as DetailBody).viewer).toMatchObject({ userId: null, isHost: false });
    expect(((await asHost.json()) as DetailBody).viewer).toMatchObject({ userId: HOST, isHost: true });
  });

  it('should hide a private tournament without the ?code= of its link', async () => {
    const id = await createdId({ visibility: 'private' });

    const withoutCode = await detail(id, 'bob');
    const withCode = await detail(id, 'bob', '?code=abcdefgh');

    expect(withoutCode.status).toBe(404);
    expect(withCode.status).toBe(200);
  });

  it('should let the host edit and refuse anyone else with 403', async () => {
    const id = await createdId();
    const edit = (as: string, name: string) => {
      signInAs(as);
      return tournamentRoute.PATCH(apiRequest('PATCH', `/api/tournaments/${id}`, { json: { name } }), routeParams({ id }));
    };

    const byHost = await edit(HOST, 'Summer Cup');
    const byOther = await edit('bob', 'Hijacked Cup');

    expect(byHost.status).toBe(200);
    expect(((await byHost.json()) as DetailBody).tournament.name).toBe('Summer Cup');
    expect(byOther.status).toBe(403);
    expect(harness().tournamentRepo.rows.get(id)?.name).toBe('Summer Cup');
  });
});

describe('POST, DELETE /api/tournaments/[id]/registration', () => {
  it('should register with an empty body and withdraw again', async () => {
    const id = await createdId();

    const registered = await register('bob', id);

    expect(registered.status).toBe(200);
    expect(((await registered.json()) as DetailBody).viewer.isEntrant).toBe(true);
    const withdrawn = await registrationRoute.DELETE(apiRequest('DELETE', `/api/tournaments/${id}/registration`), routeParams({ id }));
    expect(((await withdrawn.json()) as DetailBody).viewer.isEntrant).toBe(false);
  });

  it('should pass the inviteCode of a private tournament through, refusing a wrong one with 403', async () => {
    const id = await createdId({ visibility: 'private' });

    const wrong = await register('bob', id, { json: { inviteCode: 'wrongcod' } });
    const right = await register('bob', id, { json: { inviteCode: 'abcdefgh' } });

    expect(wrong.status).toBe(403);
    expect(right.status).toBe(200);
    expect(((await right.json()) as DetailBody).tournament.entrantCount).toBe(1);
  });

  it('should answer 409 to a second registration', async () => {
    const id = await createdId();
    await register('bob', id);

    const again = await register('bob', id);

    expect(again.status).toBe(409);
    expect(await errorOf(again)).toMatchObject({ code: 'already_registered' });
  });
});

describe('POST /api/tournaments/[id]/start, /cancel, /ticket, /matches/[matchId]/resolve', () => {
  it('should start a full enough tournament for its host only, seating round 1', async () => {
    const id = await createdId();
    // eslint-disable-next-line no-await-in-loop -- one session at a time
    for (const entrant of ENTRANTS) await register(entrant, id);

    const byEntrant = await hostAction(startRoute, 'start', id, 'u01');
    const byHost = await hostAction(startRoute, 'start', id);

    expect(byEntrant.status).toBe(403);
    expect(byHost.status).toBe(200);
    const body = (await byHost.json()) as DetailBody;
    expect(body.tournament.status).toBe('running');
    expect(body.rounds).toHaveLength(1);
  });

  it('should answer 409 too_few_entrants when the field is below the minimum', async () => {
    const id = await createdId();
    await register('u01', id);

    const response = await hostAction(startRoute, 'start', id);

    expect(response.status).toBe(409);
    expect(await errorOf(response)).toMatchObject({ code: 'too_few_entrants' });
  });

  it("should issue an entrant the ticket for their table's room", async () => {
    const id = await startedWithEntrants();
    const match = harness().tournamentRepo.rows.get(id)?.matches[0];

    const response = await hostAction(ticketRoute, 'ticket', id, 'u01');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matchId: match?.id, roomCode: match?.roomCode, ticket: expect.any(String) });
  });

  it('should answer 409 to a ticket request before the tournament started', async () => {
    const id = await createdId();
    await register('u01', id);

    const response = await hostAction(ticketRoute, 'ticket', id, 'u01');

    expect(response.status).toBe(409);
  });

  it('should void the stale table named in the path once it is past the stale deadline', async () => {
    const id = await startedWithEntrants();
    const matchId = harness().tournamentRepo.rows.get(id)?.matches[0]?.id ?? '';
    const resolve = () => {
      signInAs(HOST);
      return resolveRoute.POST(apiRequest('POST', `/api/tournaments/${id}/matches/${matchId}/resolve`), routeParams({ id, matchId }));
    };

    const tooEarly = await resolve();
    harness().time.now = T0 + TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS;
    const stale = await resolve();

    expect(tooEarly.status).toBe(409);
    expect(stale.status).toBe(200);
    expect(((await stale.json()) as DetailBody).rounds[0]?.matches[0]).toMatchObject({ id: matchId, status: 'void' });
  });

  it('should cancel for the host', async () => {
    const id = await createdId();

    const response = await hostAction(cancelRoute, 'cancel', id);

    expect(response.status).toBe(200);
    expect(((await response.json()) as DetailBody).tournament.status).toBe('cancelled');
  });
});

describe('POST /api/tournaments/[id]/invites and GET /api/tournaments/me', () => {
  it('should invite the listed players into their inbox and answer who was invited and who was skipped', async () => {
    const id = await createdId();
    signInAs(HOST);

    const response = await invitesRoute.POST(apiRequest('POST', `/api/tournaments/${id}/invites`, { json: { userIds: ['bob', 'ghost'] } }), routeParams({ id }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ invited: ['bob'], skipped: [{ userId: 'ghost', reason: 'not_found' }] });
    expect(harness().socialDb.items.find((item) => item.userId === 'bob')).toMatchObject({ kind: 'tournament_invite', payload: { tournamentId: id } });
  });

  it('should answer 422 to an invite body without userIds', async () => {
    const id = await createdId();
    signInAs(HOST);

    const response = await invitesRoute.POST(apiRequest('POST', `/api/tournaments/${id}/invites`, { json: {} }), routeParams({ id }));

    expect(response.status).toBe(422);
  });

  it("should list the signed-in player's hosted and entered tournaments", async () => {
    const id = await createdId();
    await register('bob', id);

    signInAs(HOST);
    const asHost = (await (await meRoute.GET(apiRequest('GET', '/api/tournaments/me'), NO_PARAMS)).json()) as { upcoming: { id: string; isHost: boolean }[] };
    signInAs('bob');
    const asEntrant = (await (await meRoute.GET(apiRequest('GET', '/api/tournaments/me'), NO_PARAMS)).json()) as { upcoming: { id: string; isHost: boolean }[] };

    expect(asHost.upcoming).toEqual([expect.objectContaining({ id, isHost: true })]);
    expect(asEntrant.upcoming).toEqual([expect.objectContaining({ id, isHost: false })]);
  });

  it('should require a session for the player-specific list', async () => {
    signInAs(null);

    const response = await meRoute.GET(apiRequest('GET', '/api/tournaments/me'), NO_PARAMS);

    expect(response.status).toBe(401);
  });
});
