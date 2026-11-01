import { EMAIL_CATEGORY_DEFINITIONS, type EmailCategory, type SocialPlayer } from '../../../domain/social';
import type { EmailContact, IPlayerDirectory, IPresenceStore, ISocialMailer, ISocialThrottle } from '../../ports/social';
import type { EnsureProfileUseCase } from '../account/profile.use-cases';

export type EmailNotificationOutcome = 'sent' | 'not_friends' | 'opted_out' | 'online' | 'no_email' | 'no_verified_email' | 'throttled' | 'unknown_player';

export interface EmailNotificationRequest {
  category: EmailCategory;
  senderId: string;
  recipientId: string;
}

export type EmailGateResult =
  | { send: true; contact: EmailContact; sender: SocialPlayer; recipient: SocialPlayer }
  | { send: false; outcome: Exclude<EmailNotificationOutcome, 'sent'> };

/**
 * The rules every notification email passes, whatever the category: the recipient did not opt out,
 * is offline (online players get the in-app notification), has an address the category may use
 * (an unverified one may belong to someone else: some categories skip it, others allow it within
 * an extra tight budget), and the category's budgets allow it. Budgets are checked in order and
 * short-circuited, so a refused narrow budget doesn't spend the wider ones.
 */
export class EmailNotificationGate {
  constructor(
    private readonly directory: IPlayerDirectory,
    private readonly presence: IPresenceStore,
    private readonly throttle: ISocialThrottle
  ) {}

  async check({ category, senderId, recipientId }: EmailNotificationRequest): Promise<EmailGateResult> {
    const definition = EMAIL_CATEGORY_DEFINITIONS[category];
    const [settings, contact, online] = await Promise.all([
      this.directory.getSettings(recipientId),
      this.directory.emailContact(recipientId),
      this.presence.read([recipientId]),
    ]);
    if (!settings[definition.setting]) return { send: false, outcome: 'opted_out' };
    if (online.has(recipientId)) return { send: false, outcome: 'online' };
    if (!contact) return { send: false, outcome: 'no_email' };
    if (!contact.verified && definition.unverified === 'skip') return { send: false, outcome: 'no_verified_email' };

    const subjects = { pair: `${senderId}:${recipientId}`, sender: senderId, recipient: recipientId };
    const budgets = contact.verified || definition.unverified === 'skip'
      ? definition.budgets
      : [...definition.budgets, { action: definition.unverified.budget, subject: 'recipient' as const }];
    for (const { action, subject } of budgets) {
      if (!(await this.throttle.allow(action, subjects[subject]))) return { send: false, outcome: 'throttled' };
    }

    const [sender, recipient] = await Promise.all([this.directory.findById(senderId), this.directory.findById(recipientId)]);
    if (!sender || !recipient) return { send: false, outcome: 'unknown_player' };
    return { send: true, contact, sender, recipient };
  }
}

export interface GameInviteSent {
  inviterId: string;
  recipientId: string;
  roomCode: string;
  /** Inviter and recipient are friends; only friends' invites are emailed. */
  fromFriend: boolean;
}

/**
 * Emails a friend's game invite to an offline player, so they can still join; also to an unverified
 * address, within a tighter daily budget there.
 */
export class NotifyGameInviteByEmailUseCase {
  constructor(
    private readonly gate: EmailNotificationGate,
    private readonly mailer: ISocialMailer
  ) {}

  async execute({ inviterId, recipientId, roomCode, fromFriend }: GameInviteSent): Promise<EmailNotificationOutcome> {
    // Strangers' invites stay in the inbox: email must not be a channel to reach anyone.
    if (!fromFriend) return 'not_friends';
    const gate = await this.gate.check({ category: 'game_invites', senderId: inviterId, recipientId });
    if (!gate.send) return gate.outcome;
    await this.mailer.gameInvite({ to: gate.contact.email, inviter: gate.sender, recipient: gate.recipient, roomCode, verified: gate.contact.verified });
    return 'sent';
  }
}

export interface FriendRequestSent {
  requesterId: string;
  recipientId: string;
}

/**
 * Emails a new friend request to an offline player, also to an unverified address (within a
 * tighter daily budget there). Sending is already bounded by the request rules (one pending request per pair,
 * pending and hourly limits); the email adds per-sender and per-recipient daily budgets on top.
 */
export class NotifyFriendRequestByEmailUseCase {
  constructor(
    private readonly gate: EmailNotificationGate,
    private readonly mailer: ISocialMailer
  ) {}

  async execute({ requesterId, recipientId }: FriendRequestSent): Promise<EmailNotificationOutcome> {
    const gate = await this.gate.check({ category: 'friend_requests', senderId: requesterId, recipientId });
    if (!gate.send) return gate.outcome;
    await this.mailer.friendRequest({ to: gate.contact.email, requester: gate.sender, recipient: gate.recipient, verified: gate.contact.verified });
    return 'sent';
  }
}

/** One-click unsubscribe from an email link: no session, the signed token is the authorization. */
export class UnsubscribeFromEmailsUseCase {
  constructor(
    private readonly directory: IPlayerDirectory,
    private readonly profiles: Pick<EnsureProfileUseCase, 'execute'>
  ) {}

  async execute(userId: string, category: EmailCategory): Promise<void> {
    const contact = await this.directory.emailContact(userId);
    if (!contact) return;
    // The profile row holds the setting; create it the same way the account does.
    await this.profiles.execute({ userId });
    await this.directory.updateSettings(userId, { [EMAIL_CATEGORY_DEFINITIONS[category].setting]: false });
  }
}
