import { normalizeUsername, validateUsername } from '../../../domain/account/username';
import { FRIEND_REQUEST_REJECTION_MESSAGES, SOCIAL_LIMITS, decideFriendRequest } from '../../../domain/social';
import type { IClock } from '../../ports/account';
import type { IPlayerDirectory, ISocialGraphRepository, ISocialThrottle } from '../../ports/social';
import type { InboxNotifier } from '../inbox/inbox-notifier';
import type { FriendRequestSent } from './email-notifications.use-cases';
import { RATE_LIMITED_MESSAGE, SocialError, requireUserId } from './social-error';

export type SendFriendRequestOutcome = 'sent' | 'accepted' | 'already_friends' | 'already_sent';

export interface SendFriendRequestInput {
  /** Handle of the player to add (case-insensitive). */
  username?: unknown;
  /** Or their id, e.g. from search results. */
  userId?: unknown;
}

/**
 * Sends a friend request, or accepts the target's pending request to the viewer. Throttled and
 * bounded (pending requests, friend limits, decline cooldown) so it cannot be used to spam.
 */
export class SendFriendRequestUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly directory: IPlayerDirectory,
    private readonly notifier: InboxNotifier,
    private readonly throttle: ISocialThrottle,
    private readonly clock: IClock,
    /** Follow-ups that must not delay the answer (email); errors are the listener's to handle. */
    private readonly onRequestSent: (event: FriendRequestSent) => void = () => undefined
  ) {}

  async execute(viewerId: string, input: SendFriendRequestInput): Promise<{ outcome: SendFriendRequestOutcome }> {
    // Every attempt counts, also failed lookups, so the endpoint can't be used to probe handles.
    if (!(await this.throttle.allow('friend_request', viewerId))) throw new SocialError('rate_limited', RATE_LIMITED_MESSAGE);
    const target = await this.resolveTarget(input);
    if (!target) throw new SocialError('not_found', 'No player with that name.');
    const now = this.clock.now();
    const facts = await this.graph.relationshipFacts(viewerId, target);
    const decision = decideFriendRequest(facts, target === viewerId, now);

    switch (decision.type) {
      case 'reject':
        throw new SocialError(decision.reason === 'self' || decision.reason === 'blocked' ? 'conflict' : 'forbidden', FRIEND_REQUEST_REJECTION_MESSAGES[decision.reason]);
      case 'noop':
        return { outcome: decision.reason };
      case 'accept_incoming':
        await this.acceptIncoming(viewerId, target, now);
        return { outcome: 'accepted' };
      case 'send':
        await this.graph.createRequest(viewerId, target, now);
        await this.notifier.deliver({ userId: target, kind: 'friend_request', actorId: viewerId, payload: {} });
        this.onRequestSent({ requesterId: viewerId, recipientId: target });
        return { outcome: 'sent' };
    }
  }

  private async resolveTarget(input: SendFriendRequestInput): Promise<string | null> {
    if (input.userId !== undefined) return (await this.directory.findById(requireUserId(input.userId)))?.userId ?? null;
    if (typeof input.username !== 'string' || validateUsername(input.username) !== null) {
      throw new SocialError('invalid_input', 'Enter a valid username.');
    }
    return (await this.directory.findByUsername(normalizeUsername(input.username)))?.userId ?? null;
  }

  private async acceptIncoming(viewerId: string, requesterId: string, now: number): Promise<void> {
    const result = await this.graph.acceptRequest(requesterId, viewerId, now, SOCIAL_LIMITS.MAX_FRIENDS);
    if (result === 'full') throw new SocialError('limit_reached', FRIEND_REQUEST_REJECTION_MESSAGES.friend_limit);
    if (result === 'missing') return;
    await Promise.all([
      this.notifier.withdraw(viewerId, 'friend_request', requesterId, 'accept'),
      this.notifier.deliver({ userId: requesterId, kind: 'friend_accepted', actorId: viewerId, payload: {} }),
    ]);
  }
}

/** Accepts or declines a request someone sent to the viewer. */
export class RespondToFriendRequestUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly notifier: InboxNotifier,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, requesterIdInput: unknown, accept: boolean): Promise<void> {
    const requesterId = requireUserId(requesterIdInput);
    const now = this.clock.now();
    if (accept) {
      const result = await this.graph.acceptRequest(requesterId, viewerId, now, SOCIAL_LIMITS.MAX_FRIENDS);
      if (result === 'full') throw new SocialError('limit_reached', 'One of you has reached the friend limit.');
      if (result === 'missing') throw new SocialError('not_found', 'This friend request is no longer pending.');
    } else if (!(await this.graph.declineRequest(requesterId, viewerId, now))) {
      throw new SocialError('not_found', 'This friend request is no longer pending.');
    }
    await this.notifier.withdraw(viewerId, 'friend_request', requesterId, accept ? 'accept' : 'decline');
    // Declines stay silent: no one gets a "rejected" notification.
    if (accept) await this.notifier.deliver({ userId: requesterId, kind: 'friend_accepted', actorId: viewerId, payload: {} });
  }
}

/** Withdraws the viewer's pending request and its inbox item at the recipient. */
export class CancelFriendRequestUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly notifier: InboxNotifier
  ) {}

  async execute(viewerId: string, targetIdInput: unknown): Promise<void> {
    const targetId = requireUserId(targetIdInput);
    if (!(await this.graph.cancelRequest(viewerId, targetId))) return;
    await this.notifier.withdraw(targetId, 'friend_request', viewerId, 'cancelled');
  }
}
