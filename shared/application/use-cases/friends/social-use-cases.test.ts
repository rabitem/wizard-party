import { beforeEach, describe, expect, it } from 'vitest';

import { SOCIAL_LIMITS } from '../../../domain/social';
import { InboxNotifier } from '../inbox/inbox-notifier';
import { PerformInboxActionUseCase } from '../inbox/inbox.use-cases';
import { CancelFriendRequestUseCase, RespondToFriendRequestUseCase, SendFriendRequestUseCase } from './friend-requests.use-cases';
import { BlockPlayerUseCase, GetFriendsOverviewUseCase, SetFriendPinnedUseCase } from './friends.use-cases';
import { ListSentGameInvitesUseCase, RevokeGameInviteUseCase, SendGameInviteUseCase } from './game-invites.use-cases';
import { friendsInboxHandlers } from './inbox-action-handlers';
import {
  EmailNotificationGate,
  NotifyFriendRequestByEmailUseCase,
  NotifyGameInviteByEmailUseCase,
  UnsubscribeFromEmailsUseCase,
  type FriendRequestSent,
  type GameInviteSent,
} from './email-notifications.use-cases';
import { GetRoomAccountsUseCase, SocialPulseUseCase } from './presence.use-cases';
import { SocialError } from './social-error';
import { MemorySocial } from './social-test-fakes';

let now = 1_000_000;
const clock = { now: () => now };

function setup() {
  const db = new MemorySocial();
  for (const id of ['alice', 'bob', 'carol']) db.addPlayer(id);
  const notifier = new InboxNotifier(db, clock);
  const respond = new RespondToFriendRequestUseCase(db, notifier, clock);
  const invited: GameInviteSent[] = [];
  const requested: FriendRequestSent[] = [];
  const gate = new EmailNotificationGate(db, db, db);
  return {
    db,
    invited,
    requested,
    send: new SendFriendRequestUseCase(db, db, notifier, db, clock, (event) => requested.push(event)),
    respond,
    cancel: new CancelFriendRequestUseCase(db, notifier),
    overview: new GetFriendsOverviewUseCase(db, db),
    pin: new SetFriendPinnedUseCase(db, clock),
    block: new BlockPlayerUseCase(db, db, notifier, clock),
    invite: new SendGameInviteUseCase(db, db, db, notifier, db, (event) => invited.push(event)),
    listSent: new ListSentGameInvitesUseCase(db, clock),
    revoke: new RevokeGameInviteUseCase(db, notifier, clock),
    pulse: new SocialPulseUseCase({ graph: db, directory: db, inbox: db, presence: db, roster: db, membership: db, throttle: db, clock }),
    roomAccounts: new GetRoomAccountsUseCase(db, db),
    act: new PerformInboxActionUseCase(db, friendsInboxHandlers(respond), clock),
    email: new NotifyGameInviteByEmailUseCase(gate, db),
    requestEmail: new NotifyFriendRequestByEmailUseCase(gate, db),
    unsubscribe: new UnsubscribeFromEmailsUseCase(db, { execute: async () => ({}) as never }),
  };
}

type Setup = ReturnType<typeof setup>;
const lobby = (roomCode: string) => ({ kind: 'lobby', roomCode });

/** A pulse from a player the game worker really seated in `roomCode`. */
async function seatedPulse(s: Setup, userId: string, roomCode: string, seat?: string) {
  return s.pulse.execute(userId, { activity: lobby(roomCode), seatProof: s.db.seat(roomCode, userId, seat) });
}

async function befriend(s: Setup, a: string, b: string) {
  await s.send.execute(a, { username: b });
  await s.respond.execute(b, a, true);
}

describe('SendFriendRequestUseCase', () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });

  it('should send a request and notify the target', async () => {
    expect(await s.send.execute('alice', { username: 'BOB' })).toEqual({ outcome: 'sent' });
    expect(s.requested).toEqual([{ requesterId: 'alice', recipientId: 'bob' }]);
    expect(s.db.items).toHaveLength(1);
    expect(s.db.items[0]).toMatchObject({ userId: 'bob', kind: 'friend_request', actor: { userId: 'alice' } });
  });

  it('should accept instead when the target already asked', async () => {
    await s.send.execute('bob', { username: 'alice' });
    expect(await s.send.execute('alice', { userId: 'bob' })).toEqual({ outcome: 'accepted' });
    expect(s.db.friendships.size).toBe(2);
    expect(s.db.items.find((item) => item.userId === 'alice' && item.kind === 'friend_request')?.resolution).toBe('accept');
  });

  it('should keep a silent decline looking like a pending request', async () => {
    await s.send.execute('alice', { username: 'bob' });
    await s.respond.execute('bob', 'alice', false);
    expect(await s.send.execute('alice', { username: 'bob' })).toEqual({ outcome: 'already_sent' });
    expect(s.db.items.filter((item) => item.userId === 'alice')).toHaveLength(0);
  });

  it('should throttle before looking up the target', async () => {
    s.db.denied.add('friend_request');
    await expect(s.send.execute('alice', { username: 'nobody-here' })).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('should not reveal that the target blocked the sender', async () => {
    await s.block.execute('bob', 'alice');
    await s.db.updateSettings('carol', { friendRequestPolicy: 'nobody' });
    const blocked = await s.send.execute('alice', { username: 'bob' }).catch((error: SocialError) => error.message);
    const closed = await s.send.execute('alice', { username: 'carol' }).catch((error: SocialError) => error.message);
    expect(blocked).toBe(closed);
  });

  it('should reject malformed usernames', async () => {
    await expect(s.send.execute('alice', { username: 'a' })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('friend list', () => {
  it('should refuse to accept beyond the friend limit', async () => {
    const s = setup();
    for (let i = 0; i < SOCIAL_LIMITS.MAX_FRIENDS; i += 1) s.db.friendships.set(`bob->x${i}`, { since: 0, pinnedAt: null });
    await s.db.createRequest('alice', 'bob', now);
    await expect(s.respond.execute('bob', 'alice', true)).rejects.toMatchObject({ code: 'limit_reached' });
  });

  it('should make a block look like a silent decline to the blocked player', async () => {
    const s = setup();
    await s.send.execute('alice', { username: 'bob' });
    await s.block.execute('bob', 'alice');
    expect(s.db.requests.get('alice->bob')?.declinedAt).not.toBeNull();
    await expect(s.block.execute('bob', 'nobody-here')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('should withdraw the inbox item when a request is cancelled', async () => {
    const s = setup();
    await s.send.execute('alice', { username: 'bob' });
    await s.cancel.execute('alice', 'bob');
    expect(s.db.items[0].resolution).toBe('cancelled');
  });

  it('should limit pins', async () => {
    const s = setup();
    await befriend(s, 'alice', 'bob');
    for (let i = 0; i < SOCIAL_LIMITS.MAX_PINNED_FRIENDS; i += 1) {
      s.db.addPlayer(`friend${i}`);
      await befriend(s, 'alice', `friend${i}`);
      await s.pin.execute('alice', `friend${i}`, true);
    }
    await expect(s.pin.execute('alice', 'bob', true)).rejects.toMatchObject({ code: 'limit_reached' });
  });

  it('should merge live presence into the overview', async () => {
    const s = setup();
    await befriend(s, 'alice', 'bob');
    await seatedPulse(s, 'bob', 'room42');
    const { friends } = await s.overview.execute('alice');
    expect(friends[0].presence).toMatchObject({ status: 'online', joinableRoomCode: 'room42' });
  });

  it('should remove friendship and open invites when blocking', async () => {
    const s = setup();
    await befriend(s, 'alice', 'bob');
    await seatedPulse(s, 'bob', 'room42');
    await s.invite.execute('bob', { userId: 'alice', roomCode: 'room42' });
    await s.block.execute('alice', 'bob');
    expect(s.db.friendships.size).toBe(0);
    expect(s.db.items.find((item) => item.kind === 'game_invite')?.resolution).toBe('cancelled');
  });
});

describe('SendGameInviteUseCase', () => {
  let s: Setup;
  beforeEach(async () => {
    s = setup();
    await seatedPulse(s, 'alice', 'room42');
  });

  it('should only invite to the room the sender is in', async () => {
    await expect(s.invite.execute('alice', { userId: 'bob', roomCode: 'other1' })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('should respect a friends-only policy', async () => {
    await s.db.updateSettings('bob', { invitePolicy: 'friends' });
    await expect(s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' })).rejects.toMatchObject({ code: 'forbidden' });
    await befriend(s, 'alice', 'bob');
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    expect(s.invited).toEqual([{ inviterId: 'alice', recipientId: 'bob', roomCode: 'room42', fromFriend: true }]);
  });

  it('should keep one live invite per sender', async () => {
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    await seatedPulse(s, 'alice', 'room77');
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room77' });
    const invites = s.db.items.filter((item) => item.kind === 'game_invite');
    expect(invites).toHaveLength(1);
    expect(invites[0].payload).toEqual({ roomCode: 'room77' });
  });

  it('should rate limit re-invites of the same player', async () => {
    s.db.denied.add('game_invite_pair');
    await expect(s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' })).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

describe('ListSentGameInvitesUseCase', () => {
  let s: Setup;
  beforeEach(async () => {
    s = setup();
    await seatedPulse(s, 'alice', 'room42');
  });

  it('should list the invites sent to the room, newest first, with their state', async () => {
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    now += 1000;
    await s.invite.execute('alice', { userId: 'carol', roomCode: 'room42' });
    await s.db.markRead('bob', 'all', now);
    const invites = await s.listSent.execute('alice', 'room42');
    expect(invites.map((invite) => [invite.recipient.userId, invite.state])).toEqual([
      ['carol', 'pending'],
      ['bob', 'seen'],
    ]);
    expect(invites[0]).toMatchObject({ recipient: { displayName: 'CAROL', avatar: null }, readAt: null, expiresAt: now + SOCIAL_LIMITS.GAME_INVITE_TTL_MS });
  });

  it("should leave out other rooms and other senders' invites", async () => {
    await seatedPulse(s, 'carol', 'room42');
    await s.invite.execute('carol', { userId: 'bob', roomCode: 'room42' });
    await seatedPulse(s, 'alice', 'room77');
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room77' });
    expect(await s.listSent.execute('alice', 'room42')).toEqual([]);
    expect(await s.listSent.execute('alice', 'room77')).toHaveLength(1);
  });

  it('should keep answered and expired invites for a while', async () => {
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    now += SOCIAL_LIMITS.GAME_INVITE_TTL_MS;
    expect((await s.listSent.execute('alice', 'room42'))[0].state).toBe('expired');
    now += SOCIAL_LIMITS.SENT_INVITES_WINDOW_MS;
    expect(await s.listSent.execute('alice', 'room42')).toEqual([]);
  });

  it('should reject an invalid room code', async () => {
    await expect(s.listSent.execute('alice', 'not a room')).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('RevokeGameInviteUseCase', () => {
  let s: Setup;
  beforeEach(async () => {
    s = setup();
    await seatedPulse(s, 'alice', 'room42');
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
  });

  const inviteId = (s: Setup) => s.db.items.find((item) => item.kind === 'game_invite')?.id as string;

  it("should cancel the invite in the recipient's inbox", async () => {
    await s.revoke.execute('alice', inviteId(s));
    const [item] = await s.db.list('bob');
    expect(item).toMatchObject({ resolution: 'cancelled', resolvedAt: now });
    expect((await s.listSent.execute('alice', 'room42'))[0].state).toBe('revoked');
    await expect(s.act.execute('bob', item.id, 'accept')).rejects.toBeInstanceOf(SocialError);
  });

  it("should not reveal other players' invites", async () => {
    await expect(s.revoke.execute('carol', inviteId(s))).rejects.toMatchObject({ code: 'not_found' });
    await expect(s.revoke.execute('alice', '00000000-0000-4000-8000-999999999999')).rejects.toMatchObject({ code: 'not_found' });
    await expect(s.revoke.execute('alice', 'nope')).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('should refuse invites that were answered or expired', async () => {
    await s.act.execute('bob', inviteId(s), 'decline');
    await expect(s.revoke.execute('alice', inviteId(s))).rejects.toMatchObject({ code: 'conflict' });
    const fresh = setup();
    await seatedPulse(fresh, 'alice', 'room42');
    await fresh.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    now += SOCIAL_LIMITS.GAME_INVITE_TTL_MS;
    await expect(fresh.revoke.execute('alice', inviteId(fresh))).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('PerformInboxActionUseCase', () => {
  it('should accept a friend request from the inbox', async () => {
    const s = setup();
    await s.send.execute('alice', { username: 'bob' });
    expect(await s.act.execute('bob', s.db.items[0].id, 'accept')).toEqual({});
    expect(s.db.friendships.size).toBe(2);
    expect(s.db.items.find((item) => item.userId === 'alice')?.kind).toBe('friend_accepted');
  });

  it('should send accepted invites to the lobby and refuse expired ones', async () => {
    const s = setup();
    await seatedPulse(s, 'alice', 'room42');
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    const { id } = s.db.items[0];
    expect(await s.act.execute('bob', id, 'accept')).toEqual({ navigateTo: '/lobby/room42' });
    await s.invite.execute('alice', { userId: 'bob', roomCode: 'room42' });
    now += SOCIAL_LIMITS.GAME_INVITE_TTL_MS;
    await expect(s.act.execute('bob', id, 'accept')).rejects.toThrow('expired');
  });

  it('should close an item whose request was withdrawn meanwhile', async () => {
    const s = setup();
    await s.send.execute('alice', { username: 'bob' });
    const { id } = s.db.items[0];
    s.db.requests.clear();
    await expect(s.act.execute('bob', id, 'accept')).rejects.toBeInstanceOf(SocialError);
    expect(s.db.items[0].resolution).toBe('cancelled');
  });
});

describe('presence and seats', () => {
  it('should only reveal seats to players the worker seated in the room', async () => {
    const s = setup();
    await seatedPulse(s, 'alice', 'room42', 'seat-a');
    await seatedPulse(s, 'bob', 'room42', 'seat-b');
    expect(await s.roomAccounts.execute('alice', 'room42')).toEqual([expect.objectContaining({ gamePlayerId: 'seat-b', relationship: 'none' })]);
    // Carol only claims to be there: no seat proof, so the room is not accepted.
    const pulse = await s.pulse.execute('carol', { activity: lobby('room42') });
    expect(pulse.roomCode).toBeNull();
    expect(await s.roomAccounts.execute('carol', 'room42')).toEqual([]);
  });

  it('should reject a forged seat proof and keep the player in the menus', async () => {
    const s = setup();
    s.db.seat('room42', 'bob');
    const pulse = await s.pulse.execute('carol', { activity: lobby('room42'), seatProof: 'proof-bob-0001' });
    expect(pulse.roomCode).toBeNull();
    expect(await s.db.lookup('room42')).toEqual(new Map());
    await expect(s.invite.execute('carol', { userId: 'alice', roomCode: 'room42' })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('should not tie invisible players to their seat', async () => {
    const s = setup();
    await s.db.updateSettings('bob', { presenceMode: 'invisible' });
    await seatedPulse(s, 'bob', 'room42', 'seat-b');
    expect((await s.db.lookup('room42')).has('seat-b')).toBe(false);
  });

  it('should report unread inbox items in the pulse', async () => {
    const s = setup();
    await s.send.execute('alice', { username: 'bob' });
    expect((await s.pulse.execute('bob', {})).inbox.unread).toBe(1);
  });
});

describe('NotifyGameInviteByEmailUseCase', () => {
  const event = { inviterId: 'alice', recipientId: 'bob', roomCode: 'room42', fromFriend: true };

  it('should never mail invites from strangers', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    expect(await s.email.execute({ ...event, fromFriend: false })).toBe('not_friends');
  });

  it('should mail offline players with a verified address', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    expect(await s.email.execute(event)).toBe('sent');
    expect(s.db.sent[0]).toMatchObject({ to: 'bob@example.com', inviter: { userId: 'alice' }, recipient: { userId: 'bob' } });
  });

  it('should skip opted-out and online players', async () => {
    const s = setup();
    expect(await s.email.execute(event)).toBe('no_email');
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    await s.pulse.execute('bob', {});
    expect(await s.email.execute(event)).toBe('online');
    s.db.heartbeats.clear();
    await s.db.updateSettings('bob', { emailGameInvites: false });
    expect(await s.email.execute(event)).toBe('opted_out');
    expect(s.db.sent).toHaveLength(0);
  });

  it('should stop at the sender and recipient email budgets', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    s.db.denied.add('invite_email_sender');
    expect(await s.email.execute(event)).toBe('throttled');
    s.db.denied.clear();
    s.db.denied.add('invite_email');
    expect(await s.email.execute(event)).toBe('throttled');
  });
});

describe('NotifyFriendRequestByEmailUseCase', () => {
  const event = { requesterId: 'alice', recipientId: 'bob' };

  it('should mail offline players about a new request', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    expect(await s.requestEmail.execute(event)).toBe('sent');
    expect(s.db.sentRequests[0]).toMatchObject({ to: 'bob@example.com', requester: { userId: 'alice' }, recipient: { userId: 'bob' } });
  });

  it('should also mail unverified addresses, within a one-a-day budget', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: false });
    expect(await s.requestEmail.execute(event)).toBe('sent');
    expect(s.db.sentRequests[0]).toMatchObject({ verified: false });
    s.db.denied.add('friend_request_email_unverified');
    expect(await s.requestEmail.execute(event)).toBe('throttled');
    // Invites reach unverified addresses too, within their own budget.
    const invite = { inviterId: 'alice', recipientId: 'bob', roomCode: 'room42', fromFriend: true };
    expect(await s.email.execute(invite)).toBe('sent');
    expect(s.db.sent[0]).toMatchObject({ verified: false });
    s.db.denied.add('invite_email_unverified');
    expect(await s.email.execute(invite)).toBe('throttled');
  });

  it('should respect its own opt-out, independent of invite emails', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    await s.unsubscribe.execute('bob', 'friend_requests');
    expect(await s.db.getSettings('bob')).toMatchObject({ emailFriendRequests: false, emailGameInvites: true });
    expect(await s.requestEmail.execute(event)).toBe('opted_out');
    expect(await s.email.execute({ inviterId: 'alice', recipientId: 'bob', roomCode: 'room42', fromFriend: true })).toBe('sent');
  });

  it('should skip online players and stop at its budgets', async () => {
    const s = setup();
    s.db.emails.set('bob', { email: 'bob@example.com', verified: true });
    await s.pulse.execute('bob', {});
    expect(await s.requestEmail.execute(event)).toBe('online');
    s.db.heartbeats.clear();
    s.db.denied.add('friend_request_email_sender');
    expect(await s.requestEmail.execute(event)).toBe('throttled');
    expect(s.db.sentRequests).toHaveLength(0);
  });
});
