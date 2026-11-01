import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/infrastructure/auth/auth';

import { T0, apiRequest, createApiHarness, errorOf, NO_PARAMS, routeParams, sessionUser, type ApiHarness } from '../api-test-support';
import * as blockRoute from './blocks/[userId]/route';
import * as blocksRoute from './blocks/route';
import * as friendPinRoute from './friends/[userId]/pin/route';
import * as friendRoute from './friends/[userId]/route';
import * as friendsRoute from './friends/route';
import * as inviteRoute from './invites/[id]/route';
import * as invitesRoute from './invites/route';
import * as playerRoute from './players/[username]/route';
import * as pulseRoute from './pulse/route';
import * as requestRoute from './requests/[userId]/route';
import * as roomAccountsRoute from './rooms/[roomCode]/accounts/route';
import * as searchRoute from './search/route';
import * as settingsRoute from './settings/route';

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

const ROOM = 'room42';

function signInAs(username: string): void {
  vi.mocked(getSessionUser).mockResolvedValue(sessionUser(username));
}

const db = () => harness().socialDb;

async function sendFriendRequest(from: string, to: string): Promise<Response> {
  signInAs(from);
  return friendsRoute.POST(apiRequest('POST', '/api/social/friends', { json: { username: to } }), NO_PARAMS);
}

async function answerRequest(viewer: string, requester: string, body: unknown): Promise<Response> {
  signInAs(viewer);
  return requestRoute.PUT(apiRequest('PUT', `/api/social/requests/${requester}`, { json: body }), routeParams({ userId: requester }));
}

async function befriend(a: string, b: string): Promise<void> {
  await sendFriendRequest(a, b);
  await answerRequest(b, a, { accept: true });
}

/** A heartbeat from a player the game worker seated in `roomCode`. */
async function pulseFromSeat(username: string, roomCode = ROOM): Promise<Response> {
  signInAs(username);
  const seatProof = db().seat(roomCode, username);
  return pulseRoute.POST(apiRequest('POST', '/api/social/pulse', { json: { activity: { kind: 'lobby', roomCode }, idle: false, seatProof } }), NO_PARAMS);
}

beforeEach(() => {
  app.harness = createApiHarness();
  for (const id of ['ada', 'bob', 'cy']) db().addPlayer(id);
});

afterEach(() => {
  app.harness = null;
});

describe('GET, POST /api/social/friends and /api/social/requests/[userId]', () => {
  it('should send a request by username and show it to the recipient', async () => {
    const response = await sendFriendRequest('ada', 'bob');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'sent' });
    signInAs('bob');
    const overview = (await (await friendsRoute.GET(apiRequest('GET', '/api/social/friends'), NO_PARAMS)).json()) as {
      incoming: { player: { userId: string } }[];
    };
    expect(overview.incoming.map((request) => request.player.userId)).toEqual(['ada']);
    expect(db().items.filter((item) => item.userId === 'bob').map((item) => item.kind)).toEqual(['friend_request']);
  });

  it('should refuse an oversized request body with 422 before creating anything', async () => {
    signInAs('ada');
    const response = await friendsRoute.POST(
      apiRequest('POST', '/api/social/friends', { json: { username: 'bob', padding: 'x'.repeat(1024) } }),
      NO_PARAMS
    );

    expect(response.status).toBe(422);
    expect(db().requests.size).toBe(0);
  });

  it('should answer 429 when the friend request budget is spent', async () => {
    db().denied.add('friend_request');

    const response = await sendFriendRequest('ada', 'bob');

    expect(response.status).toBe(429);
    expect(await errorOf(response)).toMatchObject({ code: 'rate_limited' });
    expect(db().requests.size).toBe(0);
  });

  it('should make both players friends when the recipient accepts with { accept: true }', async () => {
    await sendFriendRequest('ada', 'bob');

    const response = await answerRequest('bob', 'ada', { accept: true });

    expect(response.status).toBe(204);
    expect(db().friendships.has('ada->bob')).toBe(true);
    expect(db().friendships.has('bob->ada')).toBe(true);
  });

  it('should treat anything but the literal true as a decline', async () => {
    await sendFriendRequest('ada', 'bob');

    const response = await answerRequest('bob', 'ada', { accept: 'true' });

    expect(response.status).toBe(204);
    expect(db().friendships.size).toBe(0);
    expect(db().requests.get('ada->bob')?.declinedAt).toBe(T0);
  });

  it('should let the sender withdraw a request with 204 and take it out of the recipient inbox', async () => {
    await sendFriendRequest('ada', 'bob');

    signInAs('ada');
    const response = await requestRoute.DELETE(apiRequest('DELETE', '/api/social/requests/bob'), routeParams({ userId: 'bob' }));

    expect(response.status).toBe(204);
    expect(db().requests.size).toBe(0);
    expect(db().items.find((item) => item.userId === 'bob')).toMatchObject({ kind: 'friend_request', resolution: 'cancelled' });
  });
});

describe('DELETE /api/social/friends/[userId], PUT, DELETE /api/social/friends/[userId]/pin', () => {
  beforeEach(async () => {
    await befriend('ada', 'bob');
    signInAs('ada');
  });

  it('should pin and unpin the friend named in the path for the viewer only', async () => {
    const pinned = await friendPinRoute.PUT(apiRequest('PUT', '/api/social/friends/bob/pin'), routeParams({ userId: 'bob' }));

    expect(pinned.status).toBe(204);
    expect(db().friendships.get('ada->bob')?.pinnedAt).toBe(T0);
    expect(db().friendships.get('bob->ada')?.pinnedAt).toBeNull();

    const unpinned = await friendPinRoute.DELETE(apiRequest('DELETE', '/api/social/friends/bob/pin'), routeParams({ userId: 'bob' }));

    expect(unpinned.status).toBe(204);
    expect(db().friendships.get('ada->bob')?.pinnedAt).toBeNull();
  });

  it('should remove the friendship in both directions with 204', async () => {
    const response = await friendRoute.DELETE(apiRequest('DELETE', '/api/social/friends/bob'), routeParams({ userId: 'bob' }));

    expect(response.status).toBe(204);
    expect(db().friendships.size).toBe(0);
  });
});

describe('GET /api/social/blocks, PUT, DELETE /api/social/blocks/[userId]', () => {
  it('should block a friend, end the friendship and list the blocked player', async () => {
    await befriend('ada', 'bob');
    signInAs('ada');

    const response = await blockRoute.PUT(apiRequest('PUT', '/api/social/blocks/bob'), routeParams({ userId: 'bob' }));

    expect(response.status).toBe(204);
    expect(db().friendships.size).toBe(0);
    const listed = (await (await blocksRoute.GET(apiRequest('GET', '/api/social/blocks'), NO_PARAMS)).json()) as { players: { userId: string }[] };
    expect(listed.players.map((player) => player.userId)).toEqual(['bob']);
  });

  it('should unblock with 204', async () => {
    signInAs('ada');
    await blockRoute.PUT(apiRequest('PUT', '/api/social/blocks/bob'), routeParams({ userId: 'bob' }));

    const response = await blockRoute.DELETE(apiRequest('DELETE', '/api/social/blocks/bob'), routeParams({ userId: 'bob' }));

    expect(response.status).toBe(204);
    expect(db().blocks.size).toBe(0);
  });
});

describe('POST /api/social/pulse and GET /api/social/rooms/[roomCode]/accounts', () => {
  it("should answer a friend's live presence with the room they wait in", async () => {
    await befriend('ada', 'bob');
    await pulseFromSeat('bob');

    signInAs('ada');
    const response = await pulseRoute.POST(apiRequest('POST', '/api/social/pulse', { json: { activity: { kind: 'menu' } } }), NO_PARAMS);

    expect(response.status).toBe(200);
    const pulse = (await response.json()) as { presence: Record<string, { status: string; joinableRoomCode: string | null }>; roomCode: string | null };
    expect(pulse.presence.bob).toMatchObject({ status: 'online', joinableRoomCode: ROOM });
    expect(pulse.roomCode).toBeNull();
  });

  it('should list the accounts at an attested table, and nothing to a player who is not seated there', async () => {
    await pulseFromSeat('ada');
    await pulseFromSeat('bob');

    signInAs('ada');
    const seated = await roomAccountsRoute.GET(apiRequest('GET', `/api/social/rooms/${ROOM}/accounts`), routeParams({ roomCode: ROOM }));
    const seats = ((await seated.json()) as { seats: { gamePlayerId: string; player: { userId: string } }[] }).seats;
    expect(seats.map((seat) => [seat.gamePlayerId, seat.player.userId])).toEqual([['seat-bob', 'bob']]);

    signInAs('cy');
    const outsider = await roomAccountsRoute.GET(apiRequest('GET', `/api/social/rooms/${ROOM}/accounts`), routeParams({ roomCode: ROOM }));
    // Rosters cannot be scraped (docs/accounts/social.md#presence).
    expect(await outsider.json()).toEqual({ seats: [] });
  });
});

describe('GET, POST /api/social/invites and DELETE /api/social/invites/[id]', () => {
  const invite = (userId: string, roomCode = ROOM) => invitesRoute.POST(apiRequest('POST', '/api/social/invites', { json: { userId, roomCode } }), NO_PARAMS);

  it('should deliver an invite to the room the sender is seated in and list it as an ISO-dated DTO', async () => {
    await pulseFromSeat('ada');

    const response = await invite('bob');

    expect(response.status).toBe(204);
    expect(db().items.find((item) => item.userId === 'bob')).toMatchObject({ kind: 'game_invite', payload: { roomCode: ROOM } });
    const listed = await invitesRoute.GET(apiRequest('GET', `/api/social/invites?room=${ROOM}`), NO_PARAMS);
    const { invites } = (await listed.json()) as { invites: { recipient: { userId: string; avatarId: string | null }; createdAt: string; state: string }[] };
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({ recipient: { userId: 'bob', avatarId: null }, createdAt: new Date(T0).toISOString(), state: 'pending' });
  });

  it('should refuse an invite to a room the sender is not seated in with 409', async () => {
    signInAs('ada');

    const response = await invite('bob');

    expect(response.status).toBe(409);
    expect(db().items).toEqual([]);
  });

  it('should answer 422 to a listing without a valid room', async () => {
    signInAs('ada');

    const response = await invitesRoute.GET(apiRequest('GET', '/api/social/invites'), NO_PARAMS);

    expect(response.status).toBe(422);
  });

  it('should revoke an open invite with 204 and answer 409 once it is no longer open', async () => {
    await pulseFromSeat('ada');
    await invite('bob');
    const id = db().items[0]?.id ?? '';

    const revoked = await inviteRoute.DELETE(apiRequest('DELETE', `/api/social/invites/${id}`), routeParams({ id }));

    expect(revoked.status).toBe(204);
    expect(db().items[0]).toMatchObject({ resolution: 'cancelled' });
    const again = await inviteRoute.DELETE(apiRequest('DELETE', `/api/social/invites/${id}`), routeParams({ id }));
    expect(again.status).toBe(409);
  });
});

describe('GET /api/social/search and GET /api/social/players/[username]', () => {
  it('should answer 429 when the search budget is spent', async () => {
    db().denied.add('search');
    signInAs('ada');

    const response = await searchRoute.GET(apiRequest('GET', '/api/social/search?q=bob'), NO_PARAMS);

    expect(response.status).toBe(429);
  });

  it('should answer an empty list, without spending budget, for a query too short to run', async () => {
    db().denied.add('search');
    signInAs('ada');

    const response = await searchRoute.GET(apiRequest('GET', '/api/social/search?q=b'), NO_PARAMS);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ players: [] });
  });

  it("should answer a player by handle with the viewer's relationship", async () => {
    await sendFriendRequest('ada', 'bob');

    const response = await playerRoute.GET(apiRequest('GET', '/api/social/players/BOB'), routeParams({ username: 'BOB' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ player: { userId: 'bob', relationship: 'request_sent' } });
  });

  it('should answer 404 for a handle nobody has', async () => {
    signInAs('ada');

    const response = await playerRoute.GET(apiRequest('GET', '/api/social/players/nobody'), routeParams({ username: 'nobody' }));

    expect(response.status).toBe(404);
    expect(await errorOf(response)).toMatchObject({ code: 'not_found' });
  });
});

describe('GET, PATCH /api/social/settings', () => {
  it('should answer the defaults, save a change and answer the saved settings', async () => {
    signInAs('ada');
    const before = await settingsRoute.GET(apiRequest('GET', '/api/social/settings'), NO_PARAMS);
    expect(await before.json()).toMatchObject({ invitePolicy: 'everyone', presenceMode: 'online' });

    const response = await settingsRoute.PATCH(apiRequest('PATCH', '/api/social/settings', { json: { invitePolicy: 'friends', presenceMode: 'busy' } }), NO_PARAMS);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ invitePolicy: 'friends', presenceMode: 'busy' });
    expect(await db().getSettings('ada')).toMatchObject({ invitePolicy: 'friends', presenceMode: 'busy' });
    // The settings live on the profile row, which the change creates if needed.
    expect(harness().account.profiles.rows.has('ada')).toBe(true);
  });

  it('should refuse an unknown policy with 422 and keep the stored settings', async () => {
    signInAs('ada');

    const response = await settingsRoute.PATCH(apiRequest('PATCH', '/api/social/settings', { json: { invitePolicy: 'strangers' } }), NO_PARAMS);

    expect(response.status).toBe(422);
    expect(db().settings.size).toBe(0);
  });
});
