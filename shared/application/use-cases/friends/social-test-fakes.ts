import { DEFAULT_APPEARANCE } from '../../../domain/character';
import {
  DEFAULT_SOCIAL_SETTINGS,
  INBOX_KINDS,
  relationshipOf,
  type FriendRequestView,
  type InboxAction,
  type InboxItem,
  type PlayerSearchResult,
  type PresenceHeartbeat,
  type RelationshipFacts,
  type SocialPlayer,
  type SocialSettings,
  type SocialSettingsChanges,
} from '../../../domain/social';
import type {
  EmailContact,
  FriendEdge,
  FriendRequestEmail,
  GameInviteEmail,
  IInboxRepository,
  IPlayerDirectory,
  IPresenceStore,
  IRoomMembershipVerifier,
  IRoomRosterStore,
  ISocialGraphRepository,
  ISocialMailer,
  ISocialThrottle,
  InboxPageQuery,
  InboxSummary,
  SentGameInvitesQuery,
  SentInboxItem,
  StoredInboxDelivery,
} from '../../ports/social';

/* In-memory adapters for the social use case tests. Deliberately simple: no indexes, no SQL. */

const pair = (a: string, b: string) => `${a}->${b}`;

type StoredItem = InboxItem & { userId: string; actorId: string | null; dedupeKey: string | null };

export class MemorySocial
  implements ISocialGraphRepository, IPlayerDirectory, IInboxRepository, IPresenceStore, IRoomRosterStore, IRoomMembershipVerifier, ISocialThrottle, ISocialMailer
{
  players = new Map<string, SocialPlayer>();
  settings = new Map<string, SocialSettings>();
  emails = new Map<string, EmailContact>();
  friendships = new Map<string, { since: number; pinnedAt: number | null }>();
  requests = new Map<string, { createdAt: number; declinedAt: number | null }>();
  blocks = new Set<string>();
  items: StoredItem[] = [];
  heartbeats = new Map<string, PresenceHeartbeat>();
  seats = new Map<string, Map<string, string>>();
  attested = new Map<string, string>();
  /** What the game worker knows: `<room>:<seatProof>` -> seat. */
  workerSeats = new Map<string, string>();
  denied = new Set<string>();
  sent: GameInviteEmail[] = [];
  sentRequests: FriendRequestEmail[] = [];
  private nextId = 1;

  addPlayer(userId: string, overrides: Partial<SocialPlayer> = {}) {
    this.players.set(userId, { userId, username: userId, displayName: userId.toUpperCase(), avatar: null, appearance: DEFAULT_APPEARANCE, level: 1, hasPublicProfile: true, ...overrides });
  }

  // ISocialThrottle
  async allow(action: string): Promise<boolean> {
    return !this.denied.has(action);
  }

  // ISocialGraphRepository
  async relationshipFacts(viewerId: string, targetId: string): Promise<RelationshipFacts> {
    const outgoing = this.requests.get(pair(viewerId, targetId));
    const incoming = this.requests.get(pair(targetId, viewerId));
    const count = (id: string) => [...this.friendships.keys()].filter((key) => key.startsWith(`${id}->`)).length;
    return {
      isFriend: this.friendships.has(pair(viewerId, targetId)),
      blockedByViewer: this.blocks.has(pair(viewerId, targetId)),
      blockedByTarget: this.blocks.has(pair(targetId, viewerId)),
      outgoingRequest: outgoing ? { declinedAt: outgoing.declinedAt } : null,
      incomingPending: Boolean(incoming && incoming.declinedAt === null),
      targetPolicy: (await this.getSettings(targetId)).friendRequestPolicy,
      viewerFriendCount: count(viewerId),
      targetFriendCount: count(targetId),
      viewerPendingOutgoing: [...this.requests.keys()].filter((key) => key.startsWith(`${viewerId}->`)).length,
    };
  }
  async createRequest(from: string, to: string, at: number) {
    this.requests.set(pair(from, to), { createdAt: at, declinedAt: null });
  }
  async acceptRequest(from: string, to: string, at: number, maxFriends: number) {
    const request = this.requests.get(pair(from, to));
    if (!request || request.declinedAt !== null) return 'missing' as const;
    const count = (id: string) => [...this.friendships.keys()].filter((key) => key.startsWith(`${id}->`)).length;
    if (count(from) >= maxFriends || count(to) >= maxFriends) return 'full' as const;
    this.requests.delete(pair(from, to));
    this.requests.delete(pair(to, from));
    this.friendships.set(pair(from, to), { since: at, pinnedAt: null });
    this.friendships.set(pair(to, from), { since: at, pinnedAt: null });
    return 'accepted' as const;
  }
  async declineRequest(from: string, to: string, at: number) {
    const request = this.requests.get(pair(from, to));
    if (!request || request.declinedAt !== null) return false;
    request.declinedAt = at;
    return true;
  }
  async cancelRequest(from: string, to: string) {
    return this.requests.delete(pair(from, to));
  }
  async removeFriendship(a: string, b: string) {
    const existed = this.friendships.delete(pair(a, b));
    this.friendships.delete(pair(b, a));
    return existed;
  }
  async setPinned(userId: string, friendId: string, pinnedAt: number | null) {
    const edge = this.friendships.get(pair(userId, friendId));
    if (!edge) return false;
    edge.pinnedAt = pinnedAt;
    return true;
  }
  async countPinned(userId: string) {
    return [...this.friendships].filter(([key, edge]) => key.startsWith(`${userId}->`) && edge.pinnedAt !== null).length;
  }
  async block(userId: string, targetId: string, at: number) {
    this.blocks.add(pair(userId, targetId));
    await this.removeFriendship(userId, targetId);
    this.requests.delete(pair(userId, targetId));
    const theirs = this.requests.get(pair(targetId, userId));
    if (theirs && theirs.declinedAt === null) theirs.declinedAt = at;
  }
  async unblock(userId: string, targetId: string) {
    return this.blocks.delete(pair(userId, targetId));
  }
  async countBlocked(userId: string) {
    return [...this.blocks].filter((key) => key.startsWith(`${userId}->`)).length;
  }
  async listFriends(userId: string): Promise<FriendEdge[]> {
    return [...this.friendships].filter(([key]) => key.startsWith(`${userId}->`)).map(([key, edge]) => ({ player: this.players.get(key.split('->')[1]) as SocialPlayer, ...edge }));
  }
  async listIncomingRequests(userId: string): Promise<FriendRequestView[]> {
    return [...this.requests].filter(([key, r]) => key.endsWith(`->${userId}`) && r.declinedAt === null).map(([key, r]) => ({ player: this.players.get(key.split('->')[0]) as SocialPlayer, createdAt: r.createdAt }));
  }
  async listOutgoingRequests(userId: string): Promise<FriendRequestView[]> {
    return [...this.requests].filter(([key]) => key.startsWith(`${userId}->`)).map(([key, r]) => ({ player: this.players.get(key.split('->')[1]) as SocialPlayer, createdAt: r.createdAt }));
  }
  async listBlocked(userId: string) {
    return [...this.blocks].filter((key) => key.startsWith(`${userId}->`)).map((key) => this.players.get(key.split('->')[1]) as SocialPlayer);
  }
  async friendIds(userId: string) {
    return (await this.listFriends(userId)).map((edge) => edge.player.userId);
  }
  async pruneDeclined(before: number) {
    const stale = [...this.requests].filter(([, r]) => r.declinedAt !== null && r.declinedAt < before);
    for (const [key] of stale) this.requests.delete(key);
    return stale.length;
  }
  async listDeclinedIncoming(userId: string): Promise<FriendRequestView[]> {
    return [...this.requests].filter(([key, r]) => key.endsWith(`->${userId}`) && r.declinedAt !== null).map(([key, r]) => ({ player: this.players.get(key.split('->')[0]) as SocialPlayer, createdAt: r.createdAt }));
  }

  // IPlayerDirectory
  async findById(userId: string) {
    return this.players.get(userId) ?? null;
  }
  async findByUsername(username: string) {
    return [...this.players.values()].find((player) => player.username === username) ?? null;
  }
  async search(): Promise<PlayerSearchResult[]> {
    return [];
  }
  async findManyForViewer(viewerId: string, userIds: readonly string[]): Promise<PlayerSearchResult[]> {
    return userIds.flatMap((id) => {
      const player = this.players.get(id);
      if (!player || this.blocks.has(pair(id, viewerId))) return [];
      const relationship = relationshipOf({
        isFriend: this.friendships.has(pair(viewerId, id)),
        blockedByViewer: this.blocks.has(pair(viewerId, id)),
        hasOutgoingRequest: this.requests.has(pair(viewerId, id)),
        incomingPending: this.requests.get(pair(id, viewerId))?.declinedAt === null,
      });
      return [{ ...player, relationship }];
    });
  }
  async emailContact(userId: string) {
    return this.emails.get(userId) ?? null;
  }
  async getSettings(userId: string) {
    return this.settings.get(userId) ?? { ...DEFAULT_SOCIAL_SETTINGS };
  }
  async updateSettings(userId: string, changes: SocialSettingsChanges) {
    const next = { ...(await this.getSettings(userId)), ...changes };
    this.settings.set(userId, next);
    return next;
  }

  // IInboxRepository
  async deliver({ delivery, dedupeKey, expiresAt, at }: StoredInboxDelivery) {
    const existing = dedupeKey ? this.items.find((item) => item.userId === delivery.userId && item.dedupeKey === dedupeKey) : undefined;
    const actor = delivery.actorId ? this.players.get(delivery.actorId) ?? null : null;
    const fields = { kind: delivery.kind, payload: delivery.payload, actor, createdAt: at, readAt: null, expiresAt, resolvedAt: null, resolution: null };
    if (existing) {
      Object.assign(existing, fields);
      return existing.id;
    }
    const id = `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, '0')}`;
    this.items.push({ id, userId: delivery.userId, actorId: delivery.actorId, dedupeKey, ...fields } as StoredItem);
    return id;
  }
  /** Newest first (ties by id), strictly older than the cursor, like the Postgres keyset query. */
  async list(userId: string, { before, limit }: InboxPageQuery) {
    const newestFirst = (a: StoredItem, b: StoredItem) => b.createdAt - a.createdAt || Number(b.id > a.id) - Number(b.id < a.id);
    const olderThanCursor = (item: StoredItem) =>
      !before || item.createdAt < before.createdAt || (item.createdAt === before.createdAt && item.id < before.id);
    return this.items
      .filter((item) => item.userId === userId && INBOX_KINDS[item.kind] && olderThanCursor(item))
      .sort(newestFirst)
      .slice(0, limit);
  }
  async get(userId: string, id: string) {
    return this.items.find((item) => item.userId === userId && item.id === id) ?? null;
  }
  async summary(userId: string, now: number): Promise<InboxSummary> {
    const mine = this.items.filter((item) => item.userId === userId);
    const unread = mine.filter((item) => item.readAt === null && item.resolvedAt === null && (item.expiresAt === null || item.expiresAt > now)).length;
    return { unread, latestAt: mine.length ? Math.max(...mine.map((item) => item.createdAt)) : null };
  }
  async markRead(userId: string, ids: readonly string[] | 'all', at: number) {
    const targets = this.items.filter((item) => item.userId === userId && item.readAt === null && (ids === 'all' || ids.includes(item.id)));
    for (const item of targets) item.readAt = at;
    return targets.length;
  }
  async resolve(userId: string, id: string, resolution: InboxAction | 'cancelled', at: number) {
    const item = this.items.find((entry) => entry.userId === userId && entry.id === id && entry.resolvedAt === null);
    if (!item) return false;
    Object.assign(item, { resolvedAt: at, resolution });
    return true;
  }
  async resolveByKey(userId: string, dedupeKey: string, resolution: InboxAction | 'cancelled', at: number) {
    for (const item of this.items) if (item.userId === userId && item.dedupeKey === dedupeKey && item.resolvedAt === null) Object.assign(item, { resolvedAt: at, resolution });
  }
  async remove(userId: string, id: string) {
    const before = this.items.length;
    this.items = this.items.filter((item) => !(item.userId === userId && item.id === id));
    return this.items.length < before;
  }
  async prune(before: number) {
    const count = this.items.length;
    this.items = this.items.filter((item) => item.createdAt >= before);
    return count - this.items.length;
  }
  async listSentGameInvites(actorId: string, { roomCode, since, limit }: SentGameInvitesQuery) {
    return this.items
      .filter((item) => item.actorId === actorId && item.kind === 'game_invite' && item.payload.roomCode === roomCode && item.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .flatMap((item) => this.toSent(item) ?? []);
  }
  async getSent(actorId: string, id: string) {
    const item = this.items.find((entry) => entry.actorId === actorId && entry.id === id);
    return item ? this.toSent(item) : null;
  }
  private toSent(item: StoredItem): SentInboxItem | null {
    const recipient = this.players.get(item.userId);
    return recipient ? { item, recipient: { userId: recipient.userId, username: recipient.username, displayName: recipient.displayName, avatar: recipient.avatar, appearance: recipient.appearance, level: recipient.level } } : null;
  }
  async exportRaw(userId: string) {
    return this.items.filter((item) => item.userId === userId);
  }

  // IPresenceStore + IRoomRosterStore
  async publish(userId: string, heartbeat: PresenceHeartbeat) {
    this.heartbeats.set(userId, heartbeat);
  }
  async read(userIds: readonly string[]) {
    return new Map(userIds.flatMap((id) => (this.heartbeats.has(id) ? [[id, this.heartbeats.get(id) as PresenceHeartbeat] as const] : [])));
  }
  async claim(roomCode: string, seat: string, userId: string) {
    const room = this.seats.get(roomCode) ?? new Map<string, string>();
    if (!room.has(seat)) room.set(seat, userId);
    this.seats.set(roomCode, room);
  }
  async lookup(roomCode: string) {
    return new Map(this.seats.get(roomCode) ?? []);
  }
  async attestedSeat(roomCode: string, userId: string) {
    return this.attested.get(`${roomCode}:${userId}`) ?? null;
  }
  async rememberAttestedSeat(roomCode: string, userId: string, seat: string) {
    this.attested.set(`${roomCode}:${userId}`, seat);
  }

  // IRoomMembershipVerifier
  async seatOf(roomCode: string, seatProof: string) {
    return this.workerSeats.get(`${roomCode}:${seatProof}`) ?? null;
  }
  /** Seats `userId` in a room as the game worker would; returns the proof their browser holds. */
  seat(roomCode: string, userId: string, seat = `seat-${userId}`) {
    const proof = `proof-${userId}-0000`;
    this.workerSeats.set(`${roomCode}:${proof}`, seat);
    return proof;
  }

  // ISocialMailer
  async gameInvite(mail: GameInviteEmail) {
    this.sent.push(mail);
  }
  async friendRequest(mail: FriendRequestEmail) {
    this.sentRequests.push(mail);
  }
}
