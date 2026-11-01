import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from '../character';

import {
  INBOX_KINDS,
  OFFLINE_PRESENCE,
  SOCIAL_LIMITS,
  acceptsInviteFrom,
  canPerformInboxAction,
  compareFriends,
  decideFriendRequest,
  inboxItemState,
  normalizeSearchQuery,
  parsePresenceActivity,
  parseSocialSettingsChanges,
  presenceForFriends,
  presenceRank,
  relationshipOf,
  canRevokeInvite,
  sentInviteState,
  type Friend,
  type InboxItem,
  type RelationshipFacts,
} from './index';

const facts = (overrides: Partial<RelationshipFacts> = {}): RelationshipFacts => ({
  isFriend: false,
  blockedByViewer: false,
  blockedByTarget: false,
  outgoingRequest: null,
  incomingPending: false,
  targetPolicy: 'everyone',
  viewerFriendCount: 0,
  targetFriendCount: 0,
  viewerPendingOutgoing: 0,
  ...overrides,
});

const NOW = 1_000_000_000_000;

describe('decideFriendRequest', () => {
  it('should send a request between strangers', () => {
    expect(decideFriendRequest(facts(), false, NOW)).toEqual({ type: 'send' });
  });

  it('should reject yourself and players you blocked', () => {
    expect(decideFriendRequest(facts(), true, NOW)).toEqual({ type: 'reject', reason: 'self' });
    expect(decideFriendRequest(facts({ blockedByViewer: true }), false, NOW)).toEqual({ type: 'reject', reason: 'blocked' });
  });

  it('should accept when the target already asked the viewer', () => {
    expect(decideFriendRequest(facts({ incomingPending: true, targetPolicy: 'nobody' }), false, NOW)).toEqual({ type: 'accept_incoming' });
  });

  it('should keep a declined request looking sent until the cooldown is over', () => {
    const declinedAt = NOW - 1000;
    expect(decideFriendRequest(facts({ outgoingRequest: { declinedAt } }), false, NOW)).toEqual({ type: 'noop', reason: 'already_sent' });
    const later = declinedAt + SOCIAL_LIMITS.DECLINED_REQUEST_COOLDOWN_MS;
    expect(decideFriendRequest(facts({ outgoingRequest: { declinedAt } }), false, later)).toEqual({ type: 'send' });
  });

  it('should not count a renewed declined request against the pending limit', () => {
    const full = { viewerPendingOutgoing: SOCIAL_LIMITS.MAX_PENDING_OUTGOING_REQUESTS };
    expect(decideFriendRequest(facts(full), false, NOW)).toEqual({ type: 'reject', reason: 'pending_limit' });
    const renewed = facts({ ...full, outgoingRequest: { declinedAt: 0 } });
    expect(decideFriendRequest(renewed, false, NOW)).toEqual({ type: 'send' });
  });

  it('should enforce friend limits on both sides', () => {
    expect(decideFriendRequest(facts({ viewerFriendCount: SOCIAL_LIMITS.MAX_FRIENDS }), false, NOW)).toMatchObject({ reason: 'friend_limit' });
    expect(decideFriendRequest(facts({ targetFriendCount: SOCIAL_LIMITS.MAX_FRIENDS }), false, NOW)).toMatchObject({ reason: 'target_friend_limit' });
  });
});

describe('relationshipOf', () => {
  it('should prefer block over friendship over requests', () => {
    expect(relationshipOf({ isFriend: true, blockedByViewer: true, hasOutgoingRequest: false, incomingPending: false })).toBe('blocked');
    expect(relationshipOf({ isFriend: true, blockedByViewer: false, hasOutgoingRequest: true, incomingPending: true })).toBe('friend');
    expect(relationshipOf({ isFriend: false, blockedByViewer: false, hasOutgoingRequest: true, incomingPending: true })).toBe('request_received');
  });
});

describe('presence', () => {
  const heartbeat = { mode: 'online' as const, activity: { kind: 'lobby' as const, roomCode: 'abc123', gamePlayerId: 'p1' }, idle: false, at: NOW };

  it('should hide invisible players and their room', () => {
    expect(presenceForFriends({ ...heartbeat, mode: 'invisible' })).toEqual(OFFLINE_PRESENCE);
    expect(presenceForFriends(null)).toEqual(OFFLINE_PRESENCE);
  });

  it('should only share the room code of a joinable lobby', () => {
    expect(presenceForFriends(heartbeat).joinableRoomCode).toBe('abc123');
    expect(presenceForFriends({ ...heartbeat, activity: { ...heartbeat.activity, kind: 'game' } }).joinableRoomCode).toBeNull();
  });

  it('should show hidden tabs as away and keep busy', () => {
    expect(presenceForFriends({ ...heartbeat, idle: true }).status).toBe('away');
    expect(presenceForFriends({ ...heartbeat, mode: 'busy', idle: true }).status).toBe('busy');
  });

  it('should treat malformed activity as the menus', () => {
    expect(parsePresenceActivity({ kind: 'lobby', roomCode: '<script>' })).toEqual({ kind: 'menu' });
    expect(parsePresenceActivity('lobby')).toEqual({ kind: 'menu' });
    // Clients never name their seat; only the worker's attestation does.
    expect(parsePresenceActivity({ kind: 'game', roomCode: 'abc123', gamePlayerId: 'someone-else' })).toEqual({ kind: 'game', roomCode: 'abc123', gamePlayerId: null });
  });
});

describe('compareFriends', () => {
  const friend = (name: string, pinnedAt: number | null, status: 'online' | 'offline'): Friend => ({
    userId: name, username: name, displayName: name, avatar: null, appearance: DEFAULT_APPEARANCE, level: 1, hasPublicProfile: true, since: 0, pinnedAt,
    presence: status === 'online' ? { status, activity: 'menu', joinableRoomCode: null, since: 0 } : OFFLINE_PRESENCE,
  });

  it('should list pinned first, then online, then by name', () => {
    const sorted = [friend('zed', null, 'online'), friend('amy', null, 'offline'), friend('bob', 5, 'offline'), friend('cat', null, 'online')]
      .sort(compareFriends((f) => presenceRank(f.presence)))
      .map((f) => f.displayName);
    expect(sorted).toEqual(['bob', 'cat', 'zed', 'amy']);
  });
});

describe('social settings', () => {
  it('should parse valid changes and name the first invalid field', () => {
    expect(parseSocialSettingsChanges({ invitePolicy: 'friends', emailGameInvites: false })).toEqual({ invitePolicy: 'friends', emailGameInvites: false });
    expect(parseSocialSettingsChanges({ presenceMode: 'ghost' })).toBe('presence_mode');
    expect(parseSocialSettingsChanges({ emailGameInvites: 'no' })).toBe('email_game_invites');
    expect(parseSocialSettingsChanges({ emailFriendRequests: false })).toEqual({ emailFriendRequests: false });
    expect(parseSocialSettingsChanges({ emailFriendRequests: 0 })).toBe('email_friend_requests');
  });

  it('should apply invite policies', () => {
    expect(acceptsInviteFrom('everyone', false)).toBe(true);
    expect(acceptsInviteFrom('friends', false)).toBe(false);
    expect(acceptsInviteFrom('friends', true)).toBe(true);
    expect(acceptsInviteFrom('nobody', true)).toBe(false);
  });
});

describe('inbox', () => {
  const invite: InboxItem = {
    id: 'i1', kind: 'game_invite', actor: null, payload: { roomCode: 'abc123' }, createdAt: NOW, readAt: null,
    expiresAt: NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS, resolvedAt: null, resolution: null,
  };

  it('should expire invites and stop their actions', () => {
    expect(inboxItemState(invite, NOW)).toBe('actionable');
    expect(inboxItemState(invite, NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS)).toBe('expired');
    expect(canPerformInboxAction(invite, 'accept', NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS)).toBe(false);
  });

  it('should treat informational kinds as having no actions', () => {
    const accepted: InboxItem = { ...invite, kind: 'friend_accepted', payload: {}, expiresAt: null };
    expect(inboxItemState(accepted, NOW)).toBe('info');
    expect(canPerformInboxAction(accepted, 'accept', NOW)).toBe(false);
  });

  it('should reject invalid stored payloads', () => {
    expect(INBOX_KINDS.game_invite.parsePayload({ roomCode: 'no spaces allowed' })).toBeNull();
    expect(INBOX_KINDS.game_invite.parsePayload({ roomCode: 'abc123' })).toEqual({ roomCode: 'abc123' });
  });
});

describe('sentInviteState', () => {
  const invite: InboxItem = {
    id: 'i1', kind: 'game_invite', actor: null, payload: { roomCode: 'abc123' }, createdAt: NOW, readAt: null,
    expiresAt: NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS, resolvedAt: null, resolution: null,
  };

  it('should be pending until the recipient read the invite', () => {
    expect(sentInviteState(invite, NOW)).toBe('pending');
    expect(sentInviteState({ ...invite, readAt: NOW + 1 }, NOW + 2)).toBe('seen');
  });

  it('should show the answer of resolved invites', () => {
    expect(sentInviteState({ ...invite, resolvedAt: NOW, resolution: 'accept' }, NOW)).toBe('accepted');
    expect(sentInviteState({ ...invite, resolvedAt: NOW, resolution: 'decline' }, NOW)).toBe('declined');
    expect(sentInviteState({ ...invite, resolvedAt: NOW, resolution: 'cancelled' }, NOW)).toBe('revoked');
  });

  it('should expire and stop being revocable', () => {
    const later = NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS;
    expect(sentInviteState({ ...invite, readAt: NOW }, later)).toBe('expired');
    expect(canRevokeInvite(invite, NOW)).toBe(true);
    expect(canRevokeInvite(invite, later)).toBe(false);
    expect(canRevokeInvite({ ...invite, resolvedAt: NOW, resolution: 'decline' }, NOW)).toBe(false);
  });
});

describe('normalizeSearchQuery', () => {
  it('should strip @, collapse whitespace and lowercase', () => {
    expect(normalizeSearchQuery('  @Mer   Lin ', 2, 32)).toBe('mer_lin');
    expect(normalizeSearchQuery('a', 2, 32)).toBeNull();
    expect(normalizeSearchQuery(42, 2, 32)).toBeNull();
  });
});
