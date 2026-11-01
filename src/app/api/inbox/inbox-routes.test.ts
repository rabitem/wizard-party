import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SOCIAL_LIMITS } from '@shared/domain/social';

import { T0, apiRequest, errorOf, harness, NO_PARAMS, routeParams, signInAs, setUpApiHarness } from '../api-test-support';
import * as friendsRoute from '../social/friends/route';
import * as itemActionsRoute from './[id]/actions/route';
import * as itemRoute from './[id]/route';
import * as readRoute from './read/route';
import * as inboxRoute from './route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/auth/auth', async () => (await import('../api-test-support')).authModule());
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../api-test-support')).accountContainerModule());
vi.mock('@/infrastructure/social/social-container', async () => (await import('../api-test-support')).socialContainerModule());

setUpApiHarness();

const db = () => harness().socialDb;

/** `from` asks ada to be friends through the real route; the request lands in ada's inbox. */
async function requestFromTo(from: string, to = 'ada'): Promise<string> {
  db().addPlayer(from);
  signInAs(from);
  await friendsRoute.POST(apiRequest('POST', '/api/social/friends', { json: { username: to } }), NO_PARAMS);
  const item = db().items.find((entry) => entry.userId === to && entry.actorId === from);
  if (!item) throw new Error(`no inbox item from ${from}`);
  return item.id;
}

type InboxPageBody = { items: { id: string; actor: { userId: string } | null }[]; nextCursor: string | null };

async function readInbox(query = ''): Promise<Response> {
  signInAs('ada');
  return inboxRoute.GET(apiRequest('GET', `/api/inbox${query}`), NO_PARAMS);
}

beforeEach(() => {
  db().addPlayer('ada');
});

describe('GET /api/inbox', () => {
  it('should answer the newest page first and continue from the nextCursor passed as ?cursor=', async () => {
    const senders = Array.from({ length: SOCIAL_LIMITS.INBOX_PAGE_SIZE + 1 }, (_, index) => `sender${String(index).padStart(2, '0')}`);
    for (const [index, sender] of senders.entries()) {
      harness().time.now = T0 + index * 1000;
      // eslint-disable-next-line no-await-in-loop -- each request lands one second after the previous
      await requestFromTo(sender);
    }

    const first = (await (await readInbox()).json()) as InboxPageBody;
    expect(first.items).toHaveLength(SOCIAL_LIMITS.INBOX_PAGE_SIZE);
    expect(first.items[0]?.actor?.userId).toBe(senders[senders.length - 1]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = (await (await readInbox(`?cursor=${encodeURIComponent(first.nextCursor ?? '')}`)).json()) as InboxPageBody;
    expect(second.items.map((item) => item.actor?.userId)).toEqual([senders[0]]);
    expect(second.nextCursor).toBeNull();
  });

  it('should answer 422 to a cursor this server never produced', async () => {
    const response = await readInbox('?cursor=yesterday');

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input' });
  });
});

describe('POST /api/inbox/read', () => {
  it('should mark the listed ids read and answer how many changed', async () => {
    const fromBob = await requestFromTo('bob');
    const fromCy = await requestFromTo('cy');
    signInAs('ada');

    const response = await readRoute.POST(apiRequest('POST', '/api/inbox/read', { json: { ids: [fromBob] } }), NO_PARAMS);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 1 });
    expect(db().items.find((item) => item.id === fromBob)?.readAt).toBe(T0);
    expect(db().items.find((item) => item.id === fromCy)?.readAt).toBeNull();
  });

  it('should mark everything read with { all: true }', async () => {
    await requestFromTo('bob');
    await requestFromTo('cy');
    signInAs('ada');

    const response = await readRoute.POST(apiRequest('POST', '/api/inbox/read', { json: { all: true } }), NO_PARAMS);

    expect(await response.json()).toEqual({ updated: 2 });
  });

  it('should answer 422 to a body with neither ids nor all', async () => {
    signInAs('ada');

    const response = await readRoute.POST(apiRequest('POST', '/api/inbox/read', { json: {} }), NO_PARAMS);

    expect(response.status).toBe(422);
  });
});

describe('POST /api/inbox/[id]/actions', () => {
  const act = (id: string, action: unknown) =>
    itemActionsRoute.POST(apiRequest('POST', `/api/inbox/${id}/actions`, { json: { action } }), routeParams({ id }));

  it('should accept a friend request from the inbox: friends on both sides, item resolved and read', async () => {
    const id = await requestFromTo('bob');
    signInAs('ada');

    const response = await act(id, 'accept');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
    expect(db().friendships.has('ada->bob')).toBe(true);
    expect(db().friendships.has('bob->ada')).toBe(true);
    expect(db().items.find((item) => item.id === id)).toMatchObject({ resolution: 'accept', readAt: T0 });
  });

  it('should answer 409 to an action on an item that was already answered', async () => {
    const id = await requestFromTo('bob');
    signInAs('ada');
    await act(id, 'decline');

    const response = await act(id, 'accept');

    expect(response.status).toBe(409);
    expect(db().friendships.size).toBe(0);
  });

  it('should answer 422 to an action the inbox does not know', async () => {
    const id = await requestFromTo('bob');
    signInAs('ada');

    const response = await act(id, 'maybe');

    expect(response.status).toBe(422);
    expect(db().items.find((item) => item.id === id)?.resolvedAt).toBeNull();
  });

  it("should answer 404 to another player's item", async () => {
    const id = await requestFromTo('bob');
    signInAs('cy');

    const response = await act(id, 'accept');

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/inbox/[id]', () => {
  it('should dismiss the item with 204', async () => {
    const id = await requestFromTo('bob');
    signInAs('ada');

    const response = await itemRoute.DELETE(apiRequest('DELETE', `/api/inbox/${id}`), routeParams({ id }));

    expect(response.status).toBe(204);
    expect(db().items).toEqual([]);
  });

  it('should answer 422 to an id that is not an inbox item id', async () => {
    signInAs('ada');

    const response = await itemRoute.DELETE(apiRequest('DELETE', '/api/inbox/42'), routeParams({ id: '42' }));

    expect(response.status).toBe(422);
  });
});
