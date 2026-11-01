import type {
  FriendRequestView,
  InboxAction,
  InboxActor,
  InboxDelivery,
  InboxItem,
  PlayerSearchResult,
  PresenceHeartbeat,
  RelationshipFacts,
  SocialPlayer,
  SocialRateLimitedAction,
  SocialSettings,
  SocialSettingsChanges,
} from '../../../domain/social';

/*
 * Ports of the social context. Segregated by concern so each adapter (Postgres for the graph and
 * the inbox, Redis for presence and throttling today) can be swapped on its own, e.g. presence
 * moving to a Durable Object with push, without touching the use cases.
 */

export interface FriendEdge {
  player: SocialPlayer;
  since: number;
  pinnedAt: number | null;
}

/**
 * Friendships, friend requests and blocks. Multi-row changes (accept, block) are atomic in the
 * adapter, so the graph can never be half-updated.
 */
export interface ISocialGraphRepository {
  /** Everything the friend request rule needs about viewer -> target, in one read. */
  relationshipFacts(viewerId: string, targetId: string): Promise<RelationshipFacts>;
  /** Creates (or renews a declined) request from -> to. */
  createRequest(fromUserId: string, toUserId: string, at: number): Promise<void>;
  /**
   * Turns a pending request into a friendship, atomically refusing when either side already has
   * `maxFriends`. 'missing': no pending request.
   */
  acceptRequest(fromUserId: string, toUserId: string, at: number, maxFriends: number): Promise<'accepted' | 'missing' | 'full'>;
  /** Marks a pending request declined (kept as a cooldown); false when none is pending. */
  declineRequest(fromUserId: string, toUserId: string, at: number): Promise<boolean>;
  cancelRequest(fromUserId: string, toUserId: string): Promise<boolean>;
  removeFriendship(userId: string, friendId: string): Promise<boolean>;
  /** Sets or clears the viewer's pin on a friend; false when they are not friends. */
  setPinned(userId: string, friendId: string, pinnedAt: number | null): Promise<boolean>;
  countPinned(userId: string): Promise<number>;
  /**
   * Blocks and removes the friendship and the blocker's own request. The blocked player's request
   * becomes silently declined, so to them it looks exactly like a decline.
   */
  block(userId: string, targetId: string, at: number): Promise<void>;
  unblock(userId: string, targetId: string): Promise<boolean>;
  countBlocked(userId: string): Promise<number>;
  listFriends(userId: string): Promise<FriendEdge[]>;
  listIncomingRequests(userId: string): Promise<FriendRequestView[]>;
  listOutgoingRequests(userId: string): Promise<FriendRequestView[]>;
  listBlocked(userId: string): Promise<SocialPlayer[]>;
  friendIds(userId: string): Promise<string[]>;
  /** Deletes declined requests older than `before` (their cooldown is over); returns how many. */
  pruneDeclined(before: number): Promise<number>;
  /** Requests the player declined (kept as cooldown), for the data export. */
  listDeclinedIncoming(userId: string): Promise<FriendRequestView[]>;
}

export interface EmailContact {
  email: string;
  verified: boolean;
}

/** Read model of players plus their social settings. */
export interface IPlayerDirectory {
  findById(userId: string): Promise<SocialPlayer | null>;
  /** `username` is normalized (lowercase). */
  findByUsername(username: string): Promise<SocialPlayer | null>;
  /**
   * Handle prefix matches (any profile) and display-name matches (public profiles only), excluding
   * the viewer and players who blocked the viewer. `query` is normalized.
   */
  search(viewerId: string, query: string, limit: number): Promise<PlayerSearchResult[]>;
  /** The given players with the viewer's relationship, minus players who blocked the viewer. */
  findManyForViewer(viewerId: string, userIds: readonly string[]): Promise<PlayerSearchResult[]>;
  /** The account's name and email address; only used to notify the player themself. */
  emailContact(userId: string): Promise<EmailContact | null>;
  getSettings(userId: string): Promise<SocialSettings>;
  /** The player profile row must exist (see EnsureProfile). */
  updateSettings(userId: string, changes: SocialSettingsChanges): Promise<SocialSettings>;
}

export interface InboxPageQuery {
  before?: { createdAt: number; id: string };
  limit: number;
}

export interface InboxSummary {
  unread: number;
  /** Creation time of the newest item; clients refetch the inbox when it changes. */
  latestAt: number | null;
}

export interface StoredInboxDelivery {
  delivery: InboxDelivery;
  dedupeKey: string | null;
  expiresAt: number | null;
  at: number;
}

/** An item seen from the player who caused it (the actor), e.g. an invite they sent. */
export interface SentInboxItem {
  recipient: InboxActor;
  item: InboxItem;
}

export interface SentGameInvitesQuery {
  roomCode: string;
  /** Only invites created at or after this time. */
  since: number;
  limit: number;
}

export interface IInboxRepository {
  /** Inserts, or replaces the item with the same dedupe key (unread and unresolved again). */
  deliver(item: StoredInboxDelivery): Promise<string>;
  /** Newest first. Items of unknown kinds or with invalid payloads are skipped. */
  list(userId: string, query: InboxPageQuery): Promise<InboxItem[]>;
  get(userId: string, id: string): Promise<InboxItem | null>;
  summary(userId: string, now: number): Promise<InboxSummary>;
  /** Marks the given items (or all) read; returns how many changed. */
  markRead(userId: string, ids: readonly string[] | 'all', at: number): Promise<number>;
  /** Resolves an unresolved item; false when it was already resolved or does not exist. */
  resolve(userId: string, id: string, resolution: InboxAction | 'cancelled', at: number): Promise<boolean>;
  /** Resolves the open item with this dedupe key, e.g. when a request is cancelled elsewhere. */
  resolveByKey(userId: string, dedupeKey: string, resolution: InboxAction | 'cancelled', at: number): Promise<void>;
  remove(userId: string, id: string): Promise<boolean>;
  /** Deletes items created before `before`; returns how many. */
  prune(before: number): Promise<number>;
  /** Game invites the actor sent to this room, newest first, with their recipients. */
  listSentGameInvites(actorId: string, query: SentGameInvitesQuery): Promise<SentInboxItem[]>;
  /** An item the actor caused, by id; null when it does not exist or someone else caused it. */
  getSent(actorId: string, id: string): Promise<SentInboxItem | null>;
  /** Every stored row of the player, raw (no kind filter, no limit), for the data export. */
  exportRaw(userId: string): Promise<unknown[]>;
}

/** Ephemeral heartbeats with a TTL; a missing entry means offline. */
export interface IPresenceStore {
  publish(userId: string, heartbeat: PresenceHeartbeat, ttlSeconds: number): Promise<void>;
  read(userIds: readonly string[]): Promise<Map<string, PresenceHeartbeat>>;
}

/**
 * Which signed-in account sits on which seat of a game room. Seats are only claimed after the game
 * worker attested them (IRoomMembershipVerifier), first-come, and each claim expires on its own.
 */
export interface IRoomRosterStore {
  claim(roomCode: string, gamePlayerId: string, userId: string, ttlSeconds: number): Promise<void>;
  /** gamePlayerId -> userId of the live claimed seats. */
  lookup(roomCode: string): Promise<Map<string, string>>;
  /** The seat the worker attested for this account in this room, while the attestation is fresh. */
  attestedSeat(roomCode: string, userId: string): Promise<string | null>;
  rememberAttestedSeat(roomCode: string, userId: string, gamePlayerId: string, ttlSeconds: number): Promise<void>;
}

/**
 * Asks the game worker which seat a player holds, proven by the player's secret reconnect id
 * (`seatProof`), which only that player's browser knows. Null: not seated (or worker unreachable).
 */
export interface IRoomMembershipVerifier {
  seatOf(roomCode: string, seatProof: string): Promise<string | null>;
}

/** Anti-spam budgets per action and subject (user id, or user pair). */
export interface ISocialThrottle {
  allow(action: SocialRateLimitedAction, subject: string): Promise<boolean>;
}

export interface GameInviteEmail {
  to: string;
  inviter: SocialPlayer;
  recipient: SocialPlayer;
  roomCode: string;
  /** The address is verified; unverified ones get a "didn't sign up?" note. */
  verified: boolean;
}

export interface FriendRequestEmail {
  to: string;
  requester: SocialPlayer;
  recipient: SocialPlayer;
  /** The address is verified; unverified ones get a "didn't sign up?" note. */
  verified: boolean;
}

/** Renders and sends social notification emails (template, avatar card, unsubscribe link). */
export interface ISocialMailer {
  gameInvite(mail: GameInviteEmail): Promise<void>;
  friendRequest(mail: FriendRequestEmail): Promise<void>;
}
