import { SOCIAL_LIMITS } from './social.constants';
import type { FriendRequestPolicy } from './social-privacy';

/** How the viewer relates to another player, from the viewer's side. */
export type Relationship = 'self' | 'friend' | 'request_sent' | 'request_received' | 'blocked' | 'none';

/** Everything the friend-request rule needs, loaded in one read by the repository. */
export interface RelationshipFacts {
  isFriend: boolean;
  /** The viewer blocked the target. */
  blockedByViewer: boolean;
  /** The target blocked the viewer. Never revealed to the viewer. */
  blockedByTarget: boolean;
  /**
   * The viewer's request to the target, if any. Declines are silent: the sender keeps seeing the
   * request as sent, and may only renew it after a cooldown.
   */
  outgoingRequest: { declinedAt: number | null } | null;
  /** Pending request target -> viewer. */
  incomingPending: boolean;
  targetPolicy: FriendRequestPolicy;
  viewerFriendCount: number;
  targetFriendCount: number;
  viewerPendingOutgoing: number;
}

export type FriendRequestDecision =
  | { type: 'send' }
  /** The target already asked: sending back accepts, like in most games. */
  | { type: 'accept_incoming' }
  | { type: 'noop'; reason: 'already_friends' | 'already_sent' }
  | { type: 'reject'; reason: FriendRequestRejection };

export type FriendRequestRejection =
  | 'self'
  | 'blocked'
  | 'unavailable'
  | 'friend_limit'
  | 'target_friend_limit'
  | 'pending_limit';

/**
 * The friend-request policy. Blocks and a disabled request policy both answer "unavailable", so
 * the sender cannot tell which applies.
 */
export function decideFriendRequest(facts: RelationshipFacts, isSelf: boolean, now: number): FriendRequestDecision {
  if (isSelf) return { type: 'reject', reason: 'self' };
  if (facts.blockedByViewer) return { type: 'reject', reason: 'blocked' };
  if (facts.blockedByTarget) return { type: 'reject', reason: 'unavailable' };
  if (facts.isFriend) return { type: 'noop', reason: 'already_friends' };
  if (facts.viewerFriendCount >= SOCIAL_LIMITS.MAX_FRIENDS) return { type: 'reject', reason: 'friend_limit' };
  if (facts.targetFriendCount >= SOCIAL_LIMITS.MAX_FRIENDS) return { type: 'reject', reason: 'target_friend_limit' };
  if (facts.incomingPending) return { type: 'accept_incoming' };
  const outgoing = facts.outgoingRequest;
  if (outgoing && (outgoing.declinedAt === null || now - outgoing.declinedAt < SOCIAL_LIMITS.DECLINED_REQUEST_COOLDOWN_MS)) {
    return { type: 'noop', reason: 'already_sent' };
  }
  if (facts.targetPolicy === 'nobody') return { type: 'reject', reason: 'unavailable' };
  // Renewing a declined request reuses its slot, so it never counts against the pending limit.
  if (!outgoing && facts.viewerPendingOutgoing >= SOCIAL_LIMITS.MAX_PENDING_OUTGOING_REQUESTS) return { type: 'reject', reason: 'pending_limit' };
  return { type: 'send' };
}

export const FRIEND_REQUEST_REJECTION_MESSAGES: Record<FriendRequestRejection, string> = {
  self: "You can't add yourself.",
  blocked: 'Unblock this player first.',
  unavailable: "This player isn't accepting friend requests.",
  friend_limit: `You've reached the limit of ${SOCIAL_LIMITS.MAX_FRIENDS} friends.`,
  target_friend_limit: "This player's friend list is full.",
  pending_limit: 'You have too many unanswered requests. Wait for answers or cancel some.',
};

export interface RelationshipFlags {
  isFriend: boolean;
  blockedByViewer: boolean;
  /** Any request viewer -> target, also a silently declined one. */
  hasOutgoingRequest: boolean;
  incomingPending: boolean;
}

export function relationshipOf(flags: RelationshipFlags): Relationship {
  if (flags.blockedByViewer) return 'blocked';
  if (flags.isFriend) return 'friend';
  if (flags.incomingPending) return 'request_received';
  if (flags.hasOutgoingRequest) return 'request_sent';
  return 'none';
}
