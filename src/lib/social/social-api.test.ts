import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountApiError } from '@/lib/account/account-api';

import { socialApi } from './social-api';

const ORIGIN = 'https://wizardparty.test';

let sent: Request[];
let answer: () => Response;

beforeEach(() => {
  sent = [];
  answer = () => Response.json({ ok: true });
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
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

describe('socialApi requests (docs/accounts/social.md#http-api)', () => {
  it.each([
    ['the friends overview', () => socialApi.friends(), 'GET /api/social/friends', undefined],
    ['a request by name', () => socialApi.sendFriendRequest({ username: 'bob' }), 'POST /api/social/friends', { username: 'bob' }],
    ['a request by id', () => socialApi.sendFriendRequest({ userId: 'u-bob' }), 'POST /api/social/friends', { userId: 'u-bob' }],
    ['an accepted request', () => socialApi.respondToRequest('u 1', true), 'PUT /api/social/requests/u%201', { accept: true }],
    ['a declined request', () => socialApi.respondToRequest('u1', false), 'PUT /api/social/requests/u1', { accept: false }],
    ['a withdrawn request', () => socialApi.cancelRequest('u1'), 'DELETE /api/social/requests/u1', undefined],
    ['a friend removal', () => socialApi.removeFriend('u1'), 'DELETE /api/social/friends/u1', undefined],
    ['a pin', () => socialApi.setPinned('u1', true), 'PUT /api/social/friends/u1/pin', undefined],
    ['an unpin', () => socialApi.setPinned('u1', false), 'DELETE /api/social/friends/u1/pin', undefined],
    ['the block list', () => socialApi.blocked(), 'GET /api/social/blocks', undefined],
    ['a block', () => socialApi.block('u1'), 'PUT /api/social/blocks/u1', undefined],
    ['an unblock', () => socialApi.unblock('u1'), 'DELETE /api/social/blocks/u1', undefined],
    ['an invite', () => socialApi.invite('u1', 'ROOM42'), 'POST /api/social/invites', { userId: 'u1', roomCode: 'ROOM42' }],
    ['the sent invites', () => socialApi.sentInvites('ROOM 42'), 'GET /api/social/invites?room=ROOM%2042', undefined],
    ['a revoked invite', () => socialApi.revokeInvite('i1'), 'DELETE /api/social/invites/i1', undefined],
    ['a search', () => socialApi.search('al&ce'), 'GET /api/social/search?q=al%26ce', undefined],
    ['a player lookup', () => socialApi.player('Ada Lovelace'), 'GET /api/social/players/Ada%20Lovelace', undefined],
    ['the room accounts', () => socialApi.roomAccounts('ROOM42'), 'GET /api/social/rooms/ROOM42/accounts', undefined],
    ['the settings', () => socialApi.settings(), 'GET /api/social/settings', undefined],
    ['a settings change', () => socialApi.updateSettings({ presenceMode: 'busy' }), 'PATCH /api/social/settings', { presenceMode: 'busy' }],
    ['the first inbox page', () => socialApi.inbox(), 'GET /api/inbox', undefined],
    ['a later inbox page', () => socialApi.inbox('c+1'), 'GET /api/inbox?cursor=c%2B1', undefined],
    ['read ids', () => socialApi.markRead({ ids: ['a', 'b'] }), 'POST /api/inbox/read', { ids: ['a', 'b'] }],
    ['read all', () => socialApi.markRead({ all: true }), 'POST /api/inbox/read', { all: true }],
    ['a dismissal', () => socialApi.dismiss('i1'), 'DELETE /api/inbox/i1', undefined],
    ['an inbox action', () => socialApi.act('i1', 'accept'), 'POST /api/inbox/i1/actions', { action: 'accept' }],
  ])('should send %s as %s', async (_label, call, expected, body) => {
    await call();
    const request = only();
    expect(route(request)).toBe(expected);
    expect(await bodyOf(request)).toEqual(body);
  });

  it('should send a lobby heartbeat with the room code and the seat proof the worker can vouch for', async () => {
    await socialApi.pulse({ kind: 'lobby', roomCode: 'ROOM42', gamePlayerId: 'seat-7' }, false, 'proof-abcdefgh');

    const request = only();
    expect(route(request)).toBe('POST /api/social/pulse');
    // The client never names its seat: the server takes it from the worker's attestation.
    expect(await bodyOf(request)).toEqual({ activity: { kind: 'lobby', roomCode: 'ROOM42' }, idle: false, seatProof: 'proof-abcdefgh' });
  });

  it('should send a menu heartbeat without a room', async () => {
    await socialApi.pulse({ kind: 'menu' }, true);

    expect(await bodyOf(only())).toEqual({ activity: { kind: 'menu' }, idle: true });
  });
});

describe('socialApi responses', () => {
  it('should reject a rate limit with code rate_limited and status 429', async () => {
    answer = () => Response.json({ error: { code: 'rate_limited', message: 'slow down' } }, { status: 429 });

    const error = await socialApi.sendFriendRequest({ username: 'bob' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountApiError);
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', message: 'slow down' });
  });

  it('should reject an unknown player with 404 not_found', async () => {
    answer = () => Response.json({ error: { code: 'not_found', message: 'no such player' } }, { status: 404 });
    await expect(socialApi.player('ghost')).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });

  it('should reject a non-JSON error as http_error with the status text', async () => {
    answer = () => new Response('', { status: 500, statusText: 'Internal Server Error' });
    await expect(socialApi.friends()).rejects.toMatchObject({ status: 500, code: 'http_error', message: 'Internal Server Error' });
  });

  it('should resolve with nothing for 204 No Content', async () => {
    answer = () => new Response(null, { status: 204 });
    await expect(socialApi.block('u1')).resolves.toBeUndefined();
  });

  it('should resolve with the parsed body on success', async () => {
    answer = () => Response.json({ updated: 3 });
    await expect(socialApi.markRead({ all: true })).resolves.toEqual({ updated: 3 });
  });
});
