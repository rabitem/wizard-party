import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountError, type AccountErrorCode } from '@shared/application/use-cases/account';
import { SocialError, type SocialErrorCode } from '@shared/application/use-cases/friends';

import { getSessionUser, type SessionUser } from '@/infrastructure/auth/auth';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';

import { accountRoute, type AccountRequestContext } from './account-route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: vi.fn() }));
// The containers wire the Postgres and Redis adapters; the wrapper only hands them to the handler.
vi.mock('@/infrastructure/account/account-container', () => ({ getAccountServices: () => ({}) }));
vi.mock('@/infrastructure/social/social-container', () => ({ getSocialServices: () => ({}) }));

const APP_ORIGIN = 'https://wizardparty.fun';
const ENDPOINT = `${APP_ORIGIN}/api/account`;
const ROUTE_NAME = 'TEST /api/account';
const MUTATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const PLAYER: SessionUser = {
  id: 'user-ada',
  email: 'ada@example.com',
  emailVerified: true,
  username: 'ada',
  displayUsername: 'Ada',
};

/**
 * Statuses a browser client gives a meaning of its own, each owned by that client:
 * - 422: src/lib/account/game-result-outbox.ts drops the batch and never retries it;
 * - 429: src/presentation/components/friends/RelationshipButton.tsx asks the player to slow down;
 * - 401: src/presentation/hooks/social/useSocialPulse.ts treats the player as signed out;
 * - 503: src/lib/tournament/tournament-errors.ts reads it as the feature switched off (the
 *   tournament routes share this wrapper).
 */
const CLIENT_MEANINGFUL_STATUSES = [422, 429, 401, 503];

/**
 * A use-case error with no client branching on its status only has to be some other client error:
 * src/lib/account/custom-sound-sync.ts keeps a sound local on any status below 500 (over quota,
 * rejected) and the outbox retries anything but 422. Which 4xx it is stays a server convention.
 */
const OTHER_CLIENT_ERROR = 'another 4xx';
type ExpectedStatus = number | typeof OTHER_CLIENT_ERROR;

/** Typed as a Record so a new error code cannot ship without a row here. */
const ACCOUNT_ERROR_STATUS: Record<AccountErrorCode, ExpectedStatus> = {
  invalid_input: 422,
  not_found: OTHER_CLIENT_ERROR,
  conflict: OTHER_CLIENT_ERROR,
  quota_exceeded: OTHER_CLIENT_ERROR,
  already_imported: OTHER_CLIENT_ERROR,
};

const SOCIAL_ERROR_STATUS: Record<SocialErrorCode, ExpectedStatus> = {
  // One meaning for invalid input on every route of this wrapper, as documented for the
  // tournament routes that share it (docs/accounts/tournaments.md#http-api).
  invalid_input: 422,
  not_found: OTHER_CLIENT_ERROR,
  forbidden: OTHER_CLIENT_ERROR,
  conflict: OTHER_CLIENT_ERROR,
  limit_reached: OTHER_CLIENT_ERROR,
  rate_limited: 429,
};

function expectStatus(actual: number, expected: ExpectedStatus): void {
  if (expected !== OTHER_CLIENT_ERROR) {
    expect(actual).toBe(expected);
    return;
  }
  expect(actual).toBeGreaterThanOrEqual(400);
  expect(actual).toBeLessThan(500);
  expect(CLIENT_MEANINGFUL_STATUSES).not.toContain(actual);
}

type Handler = (context: AccountRequestContext) => Promise<Response>;

function request(method: string, origin?: string): Request {
  return new Request(ENDPOINT, { method, headers: origin === undefined ? {} : { origin } });
}

/** A one-line handler, like the real ones: answers who the wrapper says is signed in. */
const whoAmI: Handler = ({ identity }) => Promise.resolve(Response.json({ userId: identity.userId }));

function failingWith(error: unknown): Handler {
  return () => Promise.reject(error);
}

/** Sends `req` through accountRoute; `reached` tells whether the handler ran. */
async function send(req: Request, handler: Handler = whoAmI): Promise<{ response: Response; reached: boolean }> {
  const runs: AccountRequestContext[] = [];
  const route = accountRoute(ROUTE_NAME, (context) => {
    runs.push(context);
    return handler(context);
  });
  const response = await route(req, { params: Promise.resolve({}) });
  return { response, reached: runs.length > 0 };
}

async function errorCodeOf(response: Response): Promise<string | undefined> {
  const body = (await response.json()) as { error?: { code?: string } };
  return body.error?.code;
}

describe('accountRoute', () => {
  beforeEach(() => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(getSessionUser).mockResolvedValue(PLAYER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run a read as the signed-in player and mark the answer private and uncacheable', async () => {
    const { response } = await send(request('GET', APP_ORIGIN));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: PLAYER.id });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('should answer 503 when accounts are not configured, without running the handler', async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);

    const { response, reached } = await send(request('GET', APP_ORIGIN));

    expect(response.status).toBe(503);
    expect(await errorCodeOf(response)).toBe('unavailable');
    expect(reached).toBe(false);
  });

  it('should answer 401 without a session, without running the handler', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const { response, reached } = await send(request('POST', APP_ORIGIN));

    expect(response.status).toBe(401);
    expect(await errorCodeOf(response)).toBe('unauthenticated');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(reached).toBe(false);
  });

  describe('cross-origin requests', () => {
    it.each(MUTATIONS)('should refuse a cross-origin %s with 403 before the handler runs', async (method) => {
      const { response, reached } = await send(request(method, 'https://evil.example'));

      expect(response.status).toBe(403);
      expect(await errorCodeOf(response)).toBe('forbidden');
      expect(reached).toBe(false);
    });

    it.each([
      ['another scheme', 'http://wizardparty.fun'],
      ['another port', 'https://wizardparty.fun:8443'],
      ['a subdomain', 'https://staging.wizardparty.fun'],
      ['an opaque origin', 'null'],
    ])('should treat %s (%s) as a foreign origin for a mutation', async (_label, origin) => {
      const { response, reached } = await send(request('POST', origin));

      expect(response.status).toBe(403);
      expect(reached).toBe(false);
    });

    it('should allow a cross-origin read', async () => {
      const { response, reached } = await send(request('GET', 'https://evil.example'));

      expect(response.status).toBe(200);
      expect(reached).toBe(true);
    });

    it.each(MUTATIONS)('should allow a same-origin %s', async (method) => {
      const { response, reached } = await send(request(method, APP_ORIGIN));

      expect(response.status).toBe(200);
      expect(reached).toBe(true);
    });
  });

  describe('use-case errors', () => {
    const accountCases = Object.entries(ACCOUNT_ERROR_STATUS) as [AccountErrorCode, ExpectedStatus][];
    const socialCases = Object.entries(SOCIAL_ERROR_STATUS) as [SocialErrorCode, ExpectedStatus][];

    it.each(accountCases)('should answer AccountError %s with %s and its code', async (code, status) => {
      const message = `account use case refused: ${code}`;
      const { response } = await send(request('POST', APP_ORIGIN), failingWith(new AccountError(code, message)));

      expectStatus(response.status, status);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ error: { code, message } });
    });

    it.each(socialCases)('should answer SocialError %s with %s and its code', async (code, status) => {
      const message = `social use case refused: ${code}`;
      const { response } = await send(request('POST', APP_ORIGIN), failingWith(new SocialError(code, message)));

      expectStatus(response.status, status);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ error: { code, message } });
    });
  });

  it('should answer an unexpected failure with a generic 500 and keep the internals in the server log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const internal = new Error('connect ECONNREFUSED postgres://wizard:hunter2@db.internal:5432/wizard');

    const { response } = await send(request('POST', APP_ORIGIN), failingWith(internal));

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const text = await response.text();
    for (const secret of ['hunter2', 'db.internal', 'ECONNREFUSED', 'postgres', 'at ']) expect(text).not.toContain(secret);
    const body = JSON.parse(text) as { error: Record<string, unknown> };
    expect(Object.keys(body)).toEqual(['error']);
    expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
    expect(body.error.code).toBe('internal');

    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(log.mock.calls[0]?.[0])) as { route?: string; error?: string };
    expect(line.route).toBe(ROUTE_NAME);
    expect(line.error).toBe(internal.message);
  });
});
