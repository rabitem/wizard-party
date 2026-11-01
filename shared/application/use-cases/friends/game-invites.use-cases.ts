import { SOCIAL_LIMITS, acceptsInviteFrom, canRevokeInvite, isRoomCode, sentInviteState, type SentInviteState } from '../../../domain/social';
import type { CharacterAppearance } from '../../../domain/character';
import type { IClock } from '../../ports/account';
import type { IInboxRepository, IPlayerDirectory, IRoomRosterStore, ISocialGraphRepository, ISocialThrottle } from '../../ports/social';
import type { InboxNotifier } from '../inbox/inbox-notifier';
import { requireItemId } from '../inbox/inbox.use-cases';
import type { GameInviteSent } from './email-notifications.use-cases';
import { RATE_LIMITED_MESSAGE, SocialError, requireUserId } from './social-error';

export interface SendGameInviteInput {
  userId?: unknown;
  roomCode?: unknown;
}

/**
 * Invites a player to the room the viewer is in. The recipient's invite policy decides who may
 * invite them; blocked senders get the same answer as a "nobody" policy. Each sender has one live
 * invite per recipient (a new one replaces the old) and re-inviting the same player is throttled.
 */
export class SendGameInviteUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly directory: IPlayerDirectory,
    private readonly roster: IRoomRosterStore,
    private readonly notifier: InboxNotifier,
    private readonly throttle: ISocialThrottle,
    /** Follow-ups that must not delay the answer (email); errors are the listener's to handle. */
    private readonly onInviteSent: (event: GameInviteSent) => void = () => undefined
  ) {}

  async execute(viewerId: string, input: SendGameInviteInput): Promise<void> {
    const targetId = requireUserId(input.userId);
    if (!isRoomCode(input.roomCode)) throw new SocialError('invalid_input', 'roomCode is invalid');
    if (targetId === viewerId) throw new SocialError('invalid_input', "You can't invite yourself.");
    const roomCode = input.roomCode;
    await this.requireViewerInRoom(viewerId, roomCode);
    if (!(await this.directory.findById(targetId))) throw new SocialError('not_found', 'No such player.');

    const [facts, settings] = await Promise.all([this.graph.relationshipFacts(viewerId, targetId), this.directory.getSettings(targetId)]);
    if (facts.blockedByViewer) throw new SocialError('conflict', 'Unblock this player first.');
    if (facts.blockedByTarget || !acceptsInviteFrom(settings.invitePolicy, facts.isFriend)) {
      throw new SocialError('forbidden', settings.invitePolicy === 'friends' && !facts.blockedByTarget ? 'This player only accepts invites from friends.' : "This player isn't accepting invites.");
    }
    const [overall, pair] = await Promise.all([
      this.throttle.allow('game_invite', viewerId),
      this.throttle.allow('game_invite_pair', `${viewerId}:${targetId}`),
    ]);
    if (!overall) throw new SocialError('rate_limited', RATE_LIMITED_MESSAGE);
    if (!pair) throw new SocialError('rate_limited', 'You just invited this player. Give them a moment.');
    await this.notifier.deliver({ userId: targetId, kind: 'game_invite', actorId: viewerId, payload: { roomCode } });
    this.onInviteSent({ inviterId: viewerId, recipientId: targetId, roomCode, fromFriend: facts.isFriend });
  }

  /** Invites only point at a room the game worker attested the sender is seated in. */
  private async requireViewerInRoom(viewerId: string, roomCode: string): Promise<void> {
    if (!(await this.roster.attestedSeat(roomCode, viewerId))) {
      throw new SocialError('conflict', 'Join the room before inviting players to it.');
    }
  }
}

/** One invite the viewer sent, as the sender sees it. Times are epoch milliseconds. */
export interface SentGameInvite {
  id: string;
  recipient: { userId: string; displayName: string; avatar: string | null; appearance: CharacterAppearance };
  createdAt: number;
  readAt: number | null;
  expiresAt: number;
  state: SentInviteState;
}

/**
 * The invites the viewer sent to one room, newest first, so the lobby can show who was invited
 * and how they answered. Answered and expired invites stay listed for a while.
 */
export class ListSentGameInvitesUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, roomCode: unknown): Promise<SentGameInvite[]> {
    if (!isRoomCode(roomCode)) throw new SocialError('invalid_input', 'room is invalid');
    const now = this.clock.now();
    const sent = await this.inbox.listSentGameInvites(viewerId, {
      roomCode,
      since: now - SOCIAL_LIMITS.SENT_INVITES_WINDOW_MS,
      limit: SOCIAL_LIMITS.SENT_INVITES_MAX,
    });
    return sent.map(({ item, recipient }) => ({
      id: item.id,
      recipient: { userId: recipient.userId, displayName: recipient.displayName, avatar: recipient.avatar, appearance: recipient.appearance },
      createdAt: item.createdAt,
      readAt: item.readAt,
      expiresAt: item.expiresAt ?? item.createdAt + SOCIAL_LIMITS.GAME_INVITE_TTL_MS,
      state: sentInviteState(item, now),
    }));
  }
}

/**
 * Takes back an invite the viewer sent: it leaves the recipient's inbox as `cancelled`. Only open
 * invites can be revoked; someone else's invite is reported as missing, so ids can't be probed.
 */
export class RevokeGameInviteUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly notifier: InboxNotifier,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, inviteId: unknown): Promise<void> {
    const sent = await this.inbox.getSent(viewerId, requireItemId(inviteId));
    if (!sent || sent.item.kind !== 'game_invite') throw new SocialError('not_found', 'No such invite.');
    if (!canRevokeInvite(sent.item, this.clock.now())) throw new SocialError('conflict', 'This invite was already answered or has expired.');
    await this.notifier.withdraw(sent.recipient.userId, 'game_invite', viewerId, 'cancelled');
  }
}
