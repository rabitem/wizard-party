import { describe, expect, it } from 'vitest';

import { SOCIAL_LIMITS, type InboxDelivery } from '../../../domain/social';
import { MemorySocial } from '../friends/social-test-fakes';
import {
  DismissInboxItemUseCase,
  ListInboxUseCase,
  MarkInboxReadUseCase,
  PerformInboxActionUseCase,
  PruneSocialDataUseCase,
  type InboxActionHandler,
} from './inbox.use-cases';

const NOW = 1_700_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const clock = { now: () => NOW };
const PAGE = SOCIAL_LIMITS.INBOX_PAGE_SIZE;
const MISSING_ID = '00000000-0000-4000-8000-999999999999';

const friendAccepted = (userId: string, actorId: string): InboxDelivery => ({ userId, kind: 'friend_accepted', actorId, payload: {} });

/** Delivers `count` items to `userId`, one per millisecond, `sameTime` of them at the same instant. */
function fill(db: MemorySocial, userId: string, count: number, sameTime = 0): Promise<string[]> {
  return Promise.all(
    Array.from({ length: count }, (_, i) => {
      const at = NOW - DAY_MS + Math.max(0, i - sameTime + 1);
      return db.deliver({ delivery: friendAccepted(userId, `actor${i}`), dedupeKey: null, expiresAt: null, at });
    })
  );
}

const codeOf = (promise: Promise<unknown>) => promise.then(() => 'ok', (error: { code?: string }) => error.code);

describe('ListInboxUseCase', () => {
  it('pages newest first without gaps or repeats, also across items delivered at the same instant', async () => {
    const db = new MemorySocial();
    // The oldest ten share a timestamp; the first page ends after five of them.
    const delivered = await fill(db, 'bob', PAGE + 5, 10);
    await fill(db, 'alice', 3);
    const list = new ListInboxUseCase(db);

    const first = await list.execute('bob');
    const second = await list.execute('bob', first.nextCursor);

    expect(first.items).toHaveLength(PAGE);
    expect(first.nextCursor).not.toBeNull();
    expect(second.nextCursor).toBeNull();
    const seen = [...first.items, ...second.items];
    expect(seen.map((item) => item.id).sort()).toEqual([...delivered].sort());
    expect(seen.every((item, index) => index === 0 || seen[index - 1].createdAt >= item.createdAt)).toBe(true);
  });

  it('has no next page when the inbox holds exactly one page', async () => {
    const db = new MemorySocial();
    await fill(db, 'bob', PAGE);

    const page = await new ListInboxUseCase(db).execute('bob');

    expect(page.items).toHaveLength(PAGE);
    expect(page.nextCursor).toBeNull();
  });

  it.each([
    ['text', 'latest'],
    ['a cursor without an item id', `${NOW}.`],
    ['a cursor with a forged id', `${NOW}.1 OR 1=1`],
    ['a fractional time', `1.5.${MISSING_ID}`],
    ['a number', NOW],
  ])('refuses %s as a cursor', async (_label, cursor) => {
    await expect(codeOf(new ListInboxUseCase(new MemorySocial()).execute('bob', cursor))).resolves.toBe('invalid_input');
  });

  it.each([undefined, null, ''])('starts at the newest item for the cursor %j', async (cursor) => {
    const db = new MemorySocial();
    const [, newest] = await fill(db, 'bob', 2);

    const page = await new ListInboxUseCase(db).execute('bob', cursor);

    expect(page.items[0].id).toBe(newest);
  });
});

describe('MarkInboxReadUseCase', () => {
  it('marks the given items of the player read, and only theirs', async () => {
    const db = new MemorySocial();
    const [first, second] = await fill(db, 'bob', 3);
    const [aliceItem] = await fill(db, 'alice', 1);
    const markRead = new MarkInboxReadUseCase(db, clock);

    await expect(markRead.execute('bob', { ids: [first.toUpperCase(), second, aliceItem] })).resolves.toEqual({ updated: 2 });

    expect(db.items.filter((item) => item.readAt === NOW).map((item) => item.id)).toEqual([first, second]);
  });

  it('marks everything read with all: true', async () => {
    const db = new MemorySocial();
    await fill(db, 'bob', 4);
    await fill(db, 'alice', 1);

    await expect(new MarkInboxReadUseCase(db, clock).execute('bob', { all: true })).resolves.toEqual({ updated: 4 });

    expect(db.items.filter((item) => item.readAt === null).map((item) => item.userId)).toEqual(['alice']);
  });

  it.each([
    ['no ids', {}],
    ['an empty list', { ids: [] }],
    ['more ids than a page', { ids: Array.from({ length: PAGE + 1 }, () => MISSING_ID) }],
    ['a malformed id', { ids: ['not-a-uuid'] }],
    ['all given as a string', { all: 'true' }],
  ])('refuses %s', async (_label, input) => {
    await expect(codeOf(new MarkInboxReadUseCase(new MemorySocial(), clock).execute('bob', input))).resolves.toBe('invalid_input');
  });
});

describe('DismissInboxItemUseCase', () => {
  it("removes the player's own item and leaves other players' items alone", async () => {
    const db = new MemorySocial();
    const [bobItem] = await fill(db, 'bob', 1);
    const [aliceItem] = await fill(db, 'alice', 1);
    const dismiss = new DismissInboxItemUseCase(db);

    await dismiss.execute('bob', bobItem);
    await dismiss.execute('bob', aliceItem);

    expect(db.items.map((item) => item.id)).toEqual([aliceItem]);
    await expect(codeOf(dismiss.execute('bob', 'nope'))).resolves.toBe('invalid_input');
  });
});

describe('PerformInboxActionUseCase', () => {
  const invite = (userId: string): InboxDelivery => ({
    userId,
    kind: 'tournament_invite',
    actorId: 'host',
    payload: { tournamentId: 'abcdefghjk', name: 'Autumn Cup', inviteCode: null },
  });

  async function deliverInvite(db: MemorySocial) {
    return db.deliver({ delivery: invite('bob'), dedupeKey: null, expiresAt: NOW + DAY_MS, at: NOW - 1 });
  }

  it("runs the kind's handler, then resolves the item and marks it read", async () => {
    const db = new MemorySocial();
    const id = await deliverInvite(db);
    const handled: string[] = [];
    const handler: InboxActionHandler = async (userId, item, action) => {
      handled.push(`${userId}:${item.kind}:${action}`);
      return { navigateTo: '/tournaments/abcdefghjk' };
    };

    const result = await new PerformInboxActionUseCase(db, { tournament_invite: handler }, clock).execute('bob', id, 'accept');

    expect(result).toEqual({ navigateTo: '/tournaments/abcdefghjk' });
    expect(handled).toEqual(['bob:tournament_invite:accept']);
    expect(db.items[0]).toMatchObject({ resolution: 'accept', resolvedAt: NOW, readAt: NOW });
  });

  it('resolves an actionable kind that has no handler', async () => {
    const db = new MemorySocial();
    const id = await deliverInvite(db);

    await expect(new PerformInboxActionUseCase(db, {}, clock).execute('bob', id, 'decline')).resolves.toEqual({});

    expect(db.items[0]).toMatchObject({ resolution: 'decline', readAt: NOW });
  });

  it('leaves the item open when the handler fails for another reason than a vanished subject', async () => {
    const db = new MemorySocial();
    const id = await deliverInvite(db);
    const failing: InboxActionHandler = async () => { throw new Error('database down'); };

    await expect(new PerformInboxActionUseCase(db, { tournament_invite: failing }, clock).execute('bob', id, 'accept')).rejects.toThrow('database down');

    expect(db.items[0]).toMatchObject({ resolution: null, resolvedAt: null, readAt: null });
  });

  it.each([
    ['an action other than accept or decline', 'maybe', 'invalid_input'],
    ['an action on a missing item', 'accept', 'not_found'],
  ])('refuses %s', async (_label, action, code) => {
    const act = new PerformInboxActionUseCase(new MemorySocial(), {}, clock);

    await expect(codeOf(act.execute('bob', MISSING_ID, action))).resolves.toBe(code);
  });

  it("refuses to act on another player's item", async () => {
    const db = new MemorySocial();
    const id = await deliverInvite(db);

    await expect(codeOf(new PerformInboxActionUseCase(db, {}, clock).execute('mallory', id, 'accept'))).resolves.toBe('not_found');
    expect(db.items[0].resolution).toBeNull();
  });

  it('refuses a second answer and an action on an informational item', async () => {
    const db = new MemorySocial();
    const id = await deliverInvite(db);
    const [info] = await fill(db, 'bob', 1);
    const act = new PerformInboxActionUseCase(db, {}, clock);
    await act.execute('bob', id, 'accept');

    await expect(act.execute('bob', id, 'decline')).rejects.toMatchObject({ code: 'conflict', message: 'This notification was already answered.' });
    await expect(codeOf(act.execute('bob', info, 'accept'))).resolves.toBe('conflict');
    expect(db.items[0].resolution).toBe('accept');
  });
});

describe('PruneSocialDataUseCase', () => {
  it('deletes inbox items past retention and declined requests past their cooldown', async () => {
    const db = new MemorySocial();
    const retention = SOCIAL_LIMITS.INBOX_RETENTION_DAYS * DAY_MS;
    await Promise.all(
      [retention + 1, retention - 1].map((age) =>
        db.deliver({ delivery: friendAccepted('bob', `a${age}`), dedupeKey: null, expiresAt: null, at: NOW - age })
      )
    );
    await db.createRequest('old', 'bob', 0);
    await db.declineRequest('old', 'bob', NOW - SOCIAL_LIMITS.DECLINED_REQUEST_COOLDOWN_MS - 1);
    await db.createRequest('recent', 'bob', 0);
    await db.declineRequest('recent', 'bob', NOW - SOCIAL_LIMITS.DECLINED_REQUEST_COOLDOWN_MS + 1);
    await db.createRequest('pending', 'bob', 0);

    const pruned = await new PruneSocialDataUseCase(db, db).execute(NOW);

    expect(pruned).toEqual({ inboxItems: 1, declinedRequests: 1 });
    expect(db.items.map((item) => NOW - item.createdAt)).toEqual([retention - 1]);
    expect([...db.requests.keys()].sort()).toEqual(['pending->bob', 'recent->bob']);
  });
});
