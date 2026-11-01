import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountApiError } from '@/lib/account/account-api';

import { tournamentApi } from './tournament-api';

const ORIGIN = 'https://wizardparty.test';

let sent: Request[];
let answer: () => Response;

beforeEach(() => {
  sent = [];
  answer = () => Response.json({ ok: true });
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    // Tournament views are polled and viewer-aware: a cached answer would show a stale bracket.
    expect(init.cache).toBe('no-store');
    expect(init.credentials).toBe('same-origin');
    sent.push(new Request(new URL(path, ORIGIN), init));
    return answer();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function only(): Request {
  expect(sent).toHaveLength(1);
  return sent[0];
}

function route(request: Request): string {
  const url = new URL(request.url);
  return `${request.method} ${url.pathname}${url.search}`;
}

async function bodyOf(request: Request): Promise<unknown> {
  const text = await request.text();
  return text === '' ? undefined : JSON.parse(text);
}

describe('tournamentApi requests (docs/accounts/tournaments.md#http-api)', () => {
  it.each([
    ['the first open page', () => tournamentApi.list({ status: 'open' }), 'GET /api/tournaments?status=open', undefined],
    ['a later page', () => tournamentApi.list({ status: 'finished', cursor: 'c1', limit: 10 }), 'GET /api/tournaments?status=finished&cursor=c1&limit=10', undefined],
    ['a page with an empty cursor', () => tournamentApi.list({ status: 'live', cursor: '' }), 'GET /api/tournaments?status=live', undefined],
    ['my tournaments', () => tournamentApi.mine(), 'GET /api/tournaments/me', undefined],
    ['a detail', () => tournamentApi.get('t 1'), 'GET /api/tournaments/t%201', undefined],
    ['a private detail', () => tournamentApi.get('t1', 'INV-42'), 'GET /api/tournaments/t1?code=INV-42', undefined],
    ['a create', () => tournamentApi.create({ name: 'Cup' } as never), 'POST /api/tournaments', { name: 'Cup' }],
    ['an edit', () => tournamentApi.update('t1', { description: null }), 'PATCH /api/tournaments/t1', { description: null }],
    ['a start', () => tournamentApi.start('t1'), 'POST /api/tournaments/t1/start', undefined],
    ['a cancel', () => tournamentApi.cancel('t1'), 'POST /api/tournaments/t1/cancel', undefined],
    ['a public registration', () => tournamentApi.register('t1'), 'POST /api/tournaments/t1/registration', {}],
    ['a private registration', () => tournamentApi.register('t1', 'INV-42'), 'POST /api/tournaments/t1/registration', { inviteCode: 'INV-42' }],
    ['a withdrawal', () => tournamentApi.withdraw('t1'), 'DELETE /api/tournaments/t1/registration', undefined],
    ['a ticket', () => tournamentApi.ticket('t1'), 'POST /api/tournaments/t1/ticket', undefined],
    ['a stale table resolve', () => tournamentApi.resolveMatch('t1', 'm/2'), 'POST /api/tournaments/t1/matches/m%2F2/resolve', undefined],
    ['invites', () => tournamentApi.invite('t1', ['u1', 'u2']), 'POST /api/tournaments/t1/invites', { userIds: ['u1', 'u2'] }],
  ])('should send %s as %s', async (_label, call, expected, body) => {
    await call();
    const request = only();
    expect(route(request)).toBe(expected);
    expect(await bodyOf(request)).toEqual(body);
  });

  it('should pass the abort signal of a superseded list request on', async () => {
    const controller = new AbortController();
    let seen: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', async (_path: string, init: RequestInit) => {
      seen = init.signal;
      return Response.json({});
    });

    await tournamentApi.list({ status: 'open' }, controller.signal);

    expect(seen).toBe(controller.signal);
  });
});

describe('tournamentApi responses', () => {
  it('should reject with the tournament error code and status', async () => {
    answer = () => Response.json({ error: { code: 'full', message: 'This tournament is full.' } }, { status: 409 });

    const error = await tournamentApi.register('t1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountApiError);
    expect(error).toMatchObject({ status: 409, code: 'full', message: 'This tournament is full.' });
  });

  it('should reject a non-JSON 503 as http_error with the status text', async () => {
    answer = () => new Response('maintenance', { status: 503, statusText: 'Service Unavailable' });
    await expect(tournamentApi.mine()).rejects.toMatchObject({ status: 503, code: 'http_error', message: 'Service Unavailable' });
  });

  it('should resolve with nothing for 204 No Content', async () => {
    answer = () => new Response(null, { status: 204 });
    await expect(tournamentApi.withdraw('t1')).resolves.toBeUndefined();
  });
});
