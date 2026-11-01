import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameResult } from '@shared/domain/account';

import { revalidateTag } from 'next/cache';

import { verifyCharacterTicket } from '@shared/realtime/character-ticket';
import { CHARACTER_TICKET_SECRET, T0, apiRequest, errorOf, harness, NO_PARAMS, routeParams, sessionUser, signInAs, setUpApiHarness } from '../api-test-support';
import * as accountRoute from './route';
import * as characterRoute from './character/route';
import * as characterTicketRoute from './character/ticket/route';
import * as documentRoute from './documents/[key]/route';
import * as documentsRoute from './documents/route';
import * as exportRoute from './export/route';
import * as gamesRoute from './games/route';
import * as pinRoute from './games/[id]/pin/route';
import * as importRoute from './import/route';
import * as soundRoute from './sounds/[id]/route';
import * as soundsRoute from './sounds/route';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock('@/infrastructure/auth/auth', async () => (await import('../api-test-support')).authModule());
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../api-test-support')).accountContainerModule());
vi.mock('@/infrastructure/social/social-container', async () => (await import('../api-test-support')).socialContainerModule());
vi.mock('@/infrastructure/tournament/tournament-container', async () => (await import('../api-test-support')).tournamentContainerModule());

setUpApiHarness();

const ADA = sessionUser('ada');

/** A finished four-player game as the outbox reports it (validateGameResult's shape). */
function game(clientGameId: string, playedAt: number, overrides: Partial<GameResult> = {}): GameResult {
  return {
    clientGameId,
    playedAt,
    playerCount: 4,
    placement: 1,
    score: 120,
    rounds: [
      { bid: 1, tricksWon: 1, roundScore: 30 },
      { bid: 0, tricksWon: 1, roundScore: -10 },
    ],
    ...overrides,
  };
}

/** The smallest WAV the upload's magic-byte sniffing accepts. */
function wavBytes(): Uint8Array<ArrayBuffer> {
  const header = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WAVEfmt ');
  return new Uint8Array([...header, 0, 0, 0, 0]);
}

const SOUND_METADATA = { id: 'boom-1', name: 'Boom', duration: 1.5, category: 'magic', roles: { wizard: true } };

function soundUpload(fields: { file?: Blob; metadata?: string }): Request {
  const form = new FormData();
  if (fields.file) form.set('file', fields.file, 'boom.wav');
  if (fields.metadata !== undefined) form.set('metadata', fields.metadata);
  return apiRequest('POST', '/api/account/sounds', { body: form });
}

function purgedCacheTags(): string[] {
  return vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
}

async function recordGames(results: unknown[]): Promise<Response> {
  return gamesRoute.POST(apiRequest('POST', '/api/account/games', { json: { results } }), NO_PARAMS);
}

beforeEach(() => {
  signInAs('ada');
  vi.mocked(revalidateTag).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET, PATCH /api/account', () => {
  it('should create the profile of a new account on first read and answer an empty overview', async () => {
    const response = await accountRoute.GET(apiRequest('GET', '/api/account'), NO_PARAMS);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { profile: { userId: string; tagline: string }; stats: { gamesPlayed: number }; recentGames: unknown[] };
    expect(body.profile).toMatchObject({ userId: ADA.id, tagline: '' });
    expect(body.stats.gamesPlayed).toBe(0);
    expect(body.recentGames).toEqual([]);
    expect(harness().account.profiles.rows.get(ADA.id)).toMatchObject({ createdAt: T0 });
  });

  it('should save the tagline and visibility, answer the profile and purge the cached public profile', async () => {
    const response = await accountRoute.PATCH(
      apiRequest('PATCH', '/api/account', { json: { tagline: 'Wizard of the north', isPublic: false } }),
      NO_PARAMS
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ profile: { userId: ADA.id, tagline: 'Wizard of the north', isPublic: false } });
    expect(harness().account.profiles.rows.get(ADA.id)).toMatchObject({ tagline: 'Wizard of the north', isPublic: false });
    // Going private takes effect at once (docs/accounts/accounts.md#public-profiles).
    expect(purgedCacheTags()).toContain('public-profile:ada');
  });

  it('should refuse a body that is not a JSON object with 422 and change nothing', async () => {
    const response = await accountRoute.PATCH(apiRequest('PATCH', '/api/account', { body: '["tagline"]' }), NO_PARAMS);

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input' });
    expect(harness().account.profiles.rows.size).toBe(0);
    expect(purgedCacheTags()).toEqual([]);
  });
});

describe('GET, POST /api/account/games', () => {
  it('should record the reported results, answer which were new and count them in the stats', async () => {
    const response = await recordGames([game('game-0000001', T0 - 2000), game('game-0000002', T0 - 1000, { placement: 3 })]);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { recorded: string[]; stats: { gamesPlayed: number; gamesWon: number } };
    expect(body.recorded).toEqual(['game-0000001', 'game-0000002']);
    expect(body.stats).toMatchObject({ gamesPlayed: 2, gamesWon: 1 });
    expect((await harness().account.results.listAll(ADA.id)).map((row) => row.clientGameId)).toEqual(['game-0000001', 'game-0000002']);
  });

  it('should ignore a replayed result, so an outbox retry never counts a game twice', async () => {
    await recordGames([game('game-0000001', T0 - 2000)]);

    const response = await recordGames([game('game-0000001', T0 - 2000)]);

    expect(((await response.json()) as { recorded: string[] }).recorded).toEqual([]);
    expect(await harness().account.results.listAll(ADA.id)).toHaveLength(1);
  });

  it('should answer 422 to a batch with an invalid result and store none of it', async () => {
    const response = await recordGames([game('game-0000001', T0 - 2000), game('game-0000002', T0 - 1000, { placement: 9 })]);

    // The outbox drops a batch answered with 422 instead of retrying it forever.
    expect(response.status).toBe(422);
    expect(await harness().account.results.listAll(ADA.id)).toEqual([]);
  });

  it('should page the history newest first with the cursor and limit from the query', async () => {
    await recordGames([game('game-0000001', T0 - 3000), game('game-0000002', T0 - 2000), game('game-0000003', T0 - 1000)]);

    const first = await gamesRoute.GET(apiRequest('GET', '/api/account/games?limit=2'), NO_PARAMS);
    const firstPage = (await first.json()) as { games: GameResult[]; nextCursor: string | null; pinned?: unknown[] };
    expect(firstPage.games.map((row) => row.clientGameId)).toEqual(['game-0000003', 'game-0000002']);
    expect(firstPage.pinned).toEqual([]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const cursor = encodeURIComponent(firstPage.nextCursor ?? '');
    const second = await gamesRoute.GET(apiRequest('GET', `/api/account/games?limit=2&cursor=${cursor}`), NO_PARAMS);
    const secondPage = (await second.json()) as { games: GameResult[]; nextCursor: string | null; pinned?: unknown[] };
    expect(secondPage.games.map((row) => row.clientGameId)).toEqual(['game-0000001']);
    expect(secondPage.nextCursor).toBeNull();
    // Pinned games come with the first page only.
    expect(secondPage).not.toHaveProperty('pinned');
  });

  it.each([
    ['a limit above the maximum page size', 'limit=51'],
    ['a cursor this server never produced', 'cursor=not-a-cursor'],
  ])('should answer 422 to %s', async (_label, query) => {
    const response = await gamesRoute.GET(apiRequest('GET', `/api/account/games?${query}`), NO_PARAMS);

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input' });
  });
});

describe('PUT, DELETE /api/account/games/[id]/pin', () => {
  const pin = (id: string) => pinRoute.PUT(apiRequest('PUT', `/api/account/games/${id}/pin`), routeParams({ id }));
  const unpin = (id: string) => pinRoute.DELETE(apiRequest('DELETE', `/api/account/games/${id}/pin`), routeParams({ id }));

  it('should pin the game named in the path, show it with the history and purge the public profile', async () => {
    await recordGames([game('game-0000001', T0 - 2000), game('game-0000002', T0 - 1000)]);

    const response = await pin('game-0000001');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ clientGameId: 'game-0000001', pinnedAt: T0 });
    const history = (await (await gamesRoute.GET(apiRequest('GET', '/api/account/games'), NO_PARAMS)).json()) as { pinned: GameResult[] };
    expect(history.pinned.map((row) => row.clientGameId)).toEqual(['game-0000001']);
    expect(purgedCacheTags()).toContain('public-profile:ada');
  });

  it('should unpin with 204 and purge the public profile again', async () => {
    await recordGames([game('game-0000001', T0 - 2000)]);
    await pin('game-0000001');
    vi.mocked(revalidateTag).mockClear();

    const response = await unpin('game-0000001');

    expect(response.status).toBe(204);
    expect(await harness().account.results.listPinned(ADA.id)).toEqual([]);
    expect(purgedCacheTags()).toContain('public-profile:ada');
  });

  it('should answer 404 for a game the player never recorded', async () => {
    const response = await pin('game-0000404');

    expect(response.status).toBe(404);
    expect(await errorOf(response)).toMatchObject({ code: 'not_found' });
  });
});

describe('POST /api/account/import', () => {
  const guestStats = {
    gamesPlayed: 3,
    gamesWon: 2,
    totalScore: 300,
    totalRounds: 30,
    correctBids: 10,
    totalBids: 30,
    totalTricksWon: 25,
    highestScore: 150,
    lowestScore: 20,
    bestWinStreak: 2,
    totalPlacement: 5,
  };
  const importRequest = () =>
    apiRequest('POST', '/api/account/import', { json: { stats: guestStats, history: [game('guest-0000001', T0 - 5000)] } });

  it('should move the guest stats and kept games into the account', async () => {
    const response = await importRoute.POST(importRequest(), NO_PARAMS);

    expect(response.status).toBe(200);
    expect(((await response.json()) as { stats: { gamesPlayed: number } }).stats.gamesPlayed).toBe(3);
    expect((await harness().account.results.listAll(ADA.id)).map((row) => row.clientGameId)).toEqual(['guest-0000001']);
  });

  it('should refuse a second import with 409 already_imported', async () => {
    await importRoute.POST(importRequest(), NO_PARAMS);

    const response = await importRoute.POST(importRequest(), NO_PARAMS);

    expect(response.status).toBe(409);
    expect(await errorOf(response)).toMatchObject({ code: 'already_imported' });
  });
});

describe('GET /api/account/documents, PUT /api/account/documents/[key]', () => {
  const save = (key: string, json: unknown) =>
    documentRoute.PUT(apiRequest('PUT', `/api/account/documents/${key}`, { json }), routeParams({ key }));

  it('should create a document at version 0 and list it', async () => {
    const response = await save('game-settings', { data: { theme: 'dark' }, version: 0 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ document: { key: 'game-settings', data: { theme: 'dark' }, version: 1, updatedAt: T0 } });
    const listed = await documentsRoute.GET(apiRequest('GET', '/api/account/documents'), NO_PARAMS);
    expect(await listed.json()).toEqual({ documents: [{ key: 'game-settings', data: { theme: 'dark' }, version: 1, updatedAt: T0 }] });
  });

  it('should answer a stale version with 409 and the current document, keeping the stored one', async () => {
    await save('game-settings', { data: { theme: 'dark' }, version: 0 });

    const response = await save('game-settings', { data: { theme: 'light' }, version: 0 });

    // The sync engine retries once on top of `current` (docs/accounts/accounts.md#settings-and-sound-sync).
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: 'conflict' },
      current: { key: 'game-settings', data: { theme: 'dark' }, version: 1, updatedAt: T0 },
    });
  });

  it('should answer 404 for a document key the account cannot sync', async () => {
    const response = await save('passwords', { data: {}, version: 0 });

    expect(response.status).toBe(404);
    expect(harness().account.documents.rows.size).toBe(0);
  });
});

describe('GET, POST /api/account/sounds, PATCH, DELETE /api/account/sounds/[id]', () => {
  const upload = () => soundsRoute.POST(soundUpload({ file: new Blob([wavBytes()]), metadata: JSON.stringify(SOUND_METADATA) }), NO_PARAMS);

  it('should store an uploaded sound as a blob with its sniffed format and answer 201 with the sound', async () => {
    const response = await upload();

    expect(response.status).toBe(201);
    const { sound } = (await response.json()) as { sound: { id: string; name: string; size: number; storageKey: string; createdAt: number } };
    expect(sound).toMatchObject({ id: 'boom-1', name: 'Boom', size: wavBytes().length, createdAt: T0 });
    expect(harness().account.blobs.objects.get(sound.storageKey)?.contentType).toBe('audio/wav');
    const listed = (await (await soundsRoute.GET(apiRequest('GET', '/api/account/sounds'), NO_PARAMS)).json()) as { sounds: { id: string }[] };
    expect(listed.sounds.map((entry) => entry.id)).toEqual(['boom-1']);
  });

  it.each([
    ['without the file field', { metadata: JSON.stringify(SOUND_METADATA) }],
    ['without the metadata field', { file: new Blob([wavBytes()]) }],
    ['with metadata that is not JSON', { file: new Blob([wavBytes()]), metadata: '{id: boom' }],
  ])('should answer 422 to an upload %s and store nothing', async (_label, fields) => {
    const response = await soundsRoute.POST(soundUpload(fields), NO_PARAMS);

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input' });
    expect(harness().account.sounds.rows.size).toBe(0);
    expect(harness().account.blobs.objects.size).toBe(0);
  });

  it('should rename a sound with 204', async () => {
    await upload();

    const response = await soundRoute.PATCH(
      apiRequest('PATCH', '/api/account/sounds/boom-1', { json: { name: 'Big boom', category: 'magic', roles: { jester: true } } }),
      routeParams({ id: 'boom-1' })
    );

    expect(response.status).toBe(204);
    expect(harness().account.sounds.rows.get('ada/boom-1')).toMatchObject({ name: 'Big boom', roles: { wizard: false, jester: true } });
  });

  it('should delete a sound and its blob with 204', async () => {
    await upload();

    const response = await soundRoute.DELETE(apiRequest('DELETE', '/api/account/sounds/boom-1'), routeParams({ id: 'boom-1' }));

    expect(response.status).toBe(204);
    expect(harness().account.sounds.rows.size).toBe(0);
    expect(harness().account.blobs.objects.size).toBe(0);
  });

  it('should answer 404 when renaming a sound the account does not have', async () => {
    const response = await soundRoute.PATCH(
      apiRequest('PATCH', '/api/account/sounds/missing', { json: { name: 'Nope', category: 'magic', roles: {} } }),
      routeParams({ id: 'missing' })
    );

    expect(response.status).toBe(404);
  });
});

describe('GET /api/account/export', () => {
  it('should download everything stored about the player, including the social and tournament parts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    await recordGames([game('game-0000001', T0 - 2000)]);
    harness().socialDb.addPlayer('ada');
    harness().socialDb.addPlayer('bob');
    harness().socialDb.friendships.set('ada->bob', { since: T0 - 10, pinnedAt: null });
    harness().socialDb.friendships.set('bob->ada', { since: T0 - 10, pinnedAt: null });
    await harness().tournaments.services.create.execute('ada', { name: 'Spring Cup' });

    const response = await exportRoute.GET(apiRequest('GET', '/api/account/export'), NO_PARAMS);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    // T0 is 2027-01-15 08:00 UTC.
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="wizard-party-account-2027-01-15.json"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = (await response.json()) as {
      account: Record<string, unknown>;
      gameResults: { clientGameId: string }[];
      social: { friends: unknown[] };
      tournaments: { tournaments: { isHost: boolean; summary: { name: string } }[] };
    };
    expect(body.account).toMatchObject({ id: ADA.id, email: ADA.email, username: 'ada', displayUsername: 'ADA', usernameChangedAt: null });
    expect(body.gameResults.map((row) => row.clientGameId)).toEqual(['game-0000001']);
    expect(body.social.friends).toHaveLength(1);
    expect(body.tournaments.tournaments).toEqual([expect.objectContaining({ isHost: true, summary: expect.objectContaining({ name: 'Spring Cup' }) })]);
  });
});

describe('POST /api/account/character/ticket', () => {
  it('should sign the look the player sees for the name they sit at tables with', async () => {
    signInAs('merlin');
    const character = await (await characterRoute.GET(apiRequest('GET', '/api/account/character'), NO_PARAMS)).json();

    const response = await characterTicketRoute.POST(apiRequest('POST', '/api/account/character/ticket'), NO_PARAMS);
    const { ticket, expiresAt } = await response.json();

    expect(response.status).toBe(200);
    expect(expiresAt).toBeGreaterThan(T0);
    await expect(verifyCharacterTicket(CHARACTER_TICKET_SECRET, ticket, T0)).resolves.toEqual({
      ok: true,
      claims: { v: 1, name: sessionUser('merlin').displayUsername, appearance: character.appearance, exp: expiresAt },
    });
  });
});
