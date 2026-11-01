import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TournamentError } from '@shared/domain/tournament';

import { getSessionUser, type SessionUser } from '@/infrastructure/auth/auth';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { isTournamentsAvailable } from '@/infrastructure/tournament/tournament-config';

import { publicTournamentRoute, tournamentRoute, type PublicTournamentContext, type TournamentRequestContext } from './tournament-route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock('@/infrastructure/tournament/tournament-config', () => ({ isTournamentsAvailable: vi.fn() }));
// The containers wire the Postgres and Redis adapters; the wrappers only hand them to the handler.
vi.mock('@/infrastructure/tournament/tournament-container', () => ({ getTournamentServices: () => ({}) }));
vi.mock('@/infrastructure/account/account-container', () => ({ getAccountServices: () => ({}) }));
vi.mock('@/infrastructure/social/social-container', () => ({ getSocialServices: () => ({}) }));

const ENDPOINT = 'https://wizardparty.fun/api/tournaments';
const NO_PARAMS = { params: Promise.resolve({}) };

const PLAYER: SessionUser = { id: 'user-ada', email: 'ada@example.com', emailVerified: true, username: 'ada', displayUsername: 'Ada' };

const ok = () => Promise.resolve(Response.json({ ok: true }));

async function errorCodeOf(response: Response): Promise<string | undefined> {
  const body = (await response.json()) as { error?: { code?: string } };
  return body.error?.code;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tournamentRoute', () => {
  beforeEach(() => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(isTournamentsAvailable).mockReturnValue(true);
    vi.mocked(getSessionUser).mockResolvedValue(PLAYER);
  });

  async function send(method: string, handler: (context: TournamentRequestContext) => Promise<Response> = ok) {
    const runs: TournamentRequestContext[] = [];
    const route = tournamentRoute('TEST /api/tournaments', (context) => {
      runs.push(context);
      return handler(context);
    });
    const response = await route(new Request(ENDPOINT, { method }), NO_PARAMS);
    return { response, reached: runs.length > 0 };
  }

  it.each(['POST', 'PATCH', 'DELETE'])('should refuse a %s with 503 while tournaments are unavailable', async (method) => {
    vi.mocked(isTournamentsAvailable).mockReturnValue(false);
    const { response, reached } = await send(method);
    expect(response.status).toBe(503);
    expect(await errorCodeOf(response)).toBe('unavailable');
    expect(reached).toBe(false);
  });

  it('should keep reads open while tournaments are unavailable', async () => {
    vi.mocked(isTournamentsAvailable).mockReturnValue(false);
    const { response, reached } = await send('GET');
    expect(response.status).toBe(200);
    expect(reached).toBe(true);
  });

  it('should answer a TournamentError with its documented status', async () => {
    const { response } = await send('POST', () => Promise.reject(new TournamentError('full', 'This tournament is full.')));
    expect(response.status).toBe(409);
    expect(await errorCodeOf(response)).toBe('full');
  });
});

describe('publicTournamentRoute', () => {
  beforeEach(() => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(getSessionUser).mockReset();
    vi.mocked(getSessionUser).mockResolvedValue(PLAYER);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  async function send(session: boolean, handler: (context: PublicTournamentContext) => Promise<Response> = ok) {
    const viewers: (SessionUser | null)[] = [];
    const route = publicTournamentRoute('TEST /api/tournaments', { session }, (context) => {
      viewers.push(context.viewer);
      return handler(context);
    });
    const response = await route(new Request(ENDPOINT), NO_PARAMS);
    return { response, viewers };
  }

  it('should answer 503 without a database', async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    const { response, viewers } = await send(false);
    expect(response.status).toBe(503);
    expect(viewers).toEqual([]);
  });

  it('should serve guests without reading the session unless the route is viewer-aware', async () => {
    expect((await send(false)).viewers).toEqual([null]);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect((await send(true)).viewers).toEqual([PLAYER]);
  });

  it('should answer a TournamentError with its documented status', async () => {
    const { response } = await send(false, () => Promise.reject(new TournamentError('not_found', 'No such tournament.')));
    expect(response.status).toBe(404);
    expect(await errorCodeOf(response)).toBe('not_found');
  });

  it('should answer 500 with a generic body for an unexpected error, leaking no internals', async () => {
    const { response } = await send(false, () => Promise.reject(new Error('relation "tournaments" does not exist')));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('relation');
    expect(JSON.parse(text)).toEqual({ error: { code: 'internal', message: 'something went wrong' } });
  });
});
