import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameResult, PlayerStatsSummary } from '@shared/domain/account';

import { AccountApiError, accountApi } from './account-api';

const ORIGIN = 'https://wizardparty.test';

/** What reached the server: the request as the route handler would see it. */
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

const GAME: GameResult = { clientGameId: 'game-0000001', playedAt: 1, playerCount: 3, placement: 1, score: 30, rounds: [] };

describe('accountApi requests (docs/accounts/accounts.md#http-api)', () => {
  it.each([
    ['capabilities', () => accountApi.capabilities(), 'GET /api/account/capabilities'],
    ['overview', () => accountApi.overview(), 'GET /api/account'],
    ['documents', () => accountApi.documents(), 'GET /api/account/documents'],
    ['sounds', () => accountApi.sounds(), 'GET /api/account/sounds'],
    ['first history page', () => accountApi.gameHistory(), 'GET /api/account/games'],
    ['next history page', () => accountApi.gameHistory({ cursor: 'abc=', limit: 20 }), 'GET /api/account/games?cursor=abc%3D&limit=20'],
    ['history page without a cursor', () => accountApi.gameHistory({ cursor: null, limit: 5 }), 'GET /api/account/games?limit=5'],
    ['pin', () => accountApi.pinGame('game/1 x'), 'PUT /api/account/games/game%2F1%20x/pin'],
    ['unpin', () => accountApi.unpinGame('game-1'), 'DELETE /api/account/games/game-1/pin'],
    ['sound deletion', () => accountApi.deleteSound('a/b'), 'DELETE /api/account/sounds/a%2Fb'],
  ])('should send %s as %s', async (_label, call, expected) => {
    await call();
    expect(route(only())).toBe(expected);
  });

  it.each([
    ['a profile change', () => accountApi.updateProfile({ tagline: 'hi' }), 'PATCH /api/account', { tagline: 'hi' }],
    ['finished games', () => accountApi.recordGames([GAME]), 'POST /api/account/games', { results: [GAME] }],
    [
      'a guest import',
      () => accountApi.importGuest({ gamesPlayed: 1 } as PlayerStatsSummary, [GAME]),
      'POST /api/account/import',
      { stats: { gamesPlayed: 1 }, history: [GAME] },
    ],
    ['a document save', () => accountApi.saveDocument('game-settings', { theme: 'dark' }, 3), 'PUT /api/account/documents/game-settings', { data: { theme: 'dark' }, version: 3 }],
    ['a sound rename', () => accountApi.updateSound('s 1', { name: 'Boom' }), 'PATCH /api/account/sounds/s%201', { name: 'Boom' }],
  ])('should send %s as JSON to %s', async (_label, call, expected, body) => {
    await call();
    const request = only();
    expect(route(request)).toBe(expected);
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(await request.json()).toEqual(body);
  });

  it('should upload a sound as multipart with the file and its JSON metadata', async () => {
    const metadata = { id: 'boom', name: 'Boom', duration: 1.2 };

    await accountApi.uploadSound(new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }), metadata);

    const request = only();
    expect(route(request)).toBe('POST /api/account/sounds');
    const form = await request.formData();
    const file = form.get('file');
    expect(file).toBeInstanceOf(Blob);
    expect(new Uint8Array(await (file as Blob).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(JSON.parse(String(form.get('metadata')))).toEqual(metadata);
  });
});

describe('accountApi responses', () => {
  it('should resolve with the parsed body on success', async () => {
    answer = () => Response.json({ documents: [{ key: 'game-settings', version: 2 }] });
    await expect(accountApi.documents()).resolves.toEqual({ documents: [{ key: 'game-settings', version: 2 }] });
  });

  it('should resolve with nothing for 204 No Content', async () => {
    answer = () => new Response(null, { status: 204 });
    await expect(accountApi.unpinGame('game-1')).resolves.toBeUndefined();
  });

  it('should reject with the server error code, message, status and body, so a 409 keeps the document to retry on top of', async () => {
    const body = { error: { code: 'conflict', message: 'stale version' }, current: { key: 'game-settings', version: 7 } };
    answer = () => Response.json(body, { status: 409 });

    const error = await accountApi.saveDocument('game-settings', {}, 6).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountApiError);
    expect(error).toMatchObject({ status: 409, code: 'conflict', message: 'stale version', body });
  });

  it('should reject a non-JSON error page as http_error with the status text', async () => {
    answer = () => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' });

    await expect(accountApi.overview()).rejects.toMatchObject({ name: 'AccountApiError', status: 502, code: 'http_error', message: 'Bad Gateway', body: null });
  });

  it('should let a network failure through unchanged, so callers can tell offline from a refusal', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    const error = await accountApi.overview().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(AccountApiError);
  });
});
