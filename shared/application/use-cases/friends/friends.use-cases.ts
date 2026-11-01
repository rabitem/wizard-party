import {
  SOCIAL_LIMITS,
  compareFriends,
  presenceForFriends,
  presenceRank,
  type Friend,
  type FriendRequestView,
  type SocialPlayer,
} from '../../../domain/social';
import type { IClock } from '../../ports/account';
import type { IPlayerDirectory, IPresenceStore, ISocialGraphRepository } from '../../ports/social';
import type { InboxNotifier } from '../inbox/inbox-notifier';
import { SocialError, requireUserId } from './social-error';

export interface FriendsOverview {
  friends: Friend[];
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}

/** The friend list with live presence plus pending requests both ways, in one call. */
export class GetFriendsOverviewUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly presence: IPresenceStore
  ) {}

  async execute(viewerId: string): Promise<FriendsOverview> {
    const [edges, incoming, outgoing] = await Promise.all([
      this.graph.listFriends(viewerId),
      this.graph.listIncomingRequests(viewerId),
      this.graph.listOutgoingRequests(viewerId),
    ]);
    const heartbeats = await this.presence.read(edges.map((edge) => edge.player.userId));
    const friends = edges
      .map(({ player, since, pinnedAt }) => ({ ...player, since, pinnedAt, presence: presenceForFriends(heartbeats.get(player.userId) ?? null) }))
      .sort(compareFriends((friend) => presenceRank(friend.presence)));
    return { friends, incoming, outgoing };
  }
}

export class RemoveFriendUseCase {
  constructor(private readonly graph: ISocialGraphRepository) {}

  async execute(viewerId: string, friendIdInput: unknown): Promise<void> {
    await this.graph.removeFriendship(viewerId, requireUserId(friendIdInput));
  }
}

/** Pins keep favourite friends on top of the list, like in League of Legends. */
export class SetFriendPinnedUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, friendIdInput: unknown, pinned: boolean): Promise<void> {
    const friendId = requireUserId(friendIdInput);
    // Soft limit: two concurrent pins can exceed it by one, which is harmless.
    if (pinned && (await this.graph.countPinned(viewerId)) >= SOCIAL_LIMITS.MAX_PINNED_FRIENDS) {
      throw new SocialError('limit_reached', `You can pin up to ${SOCIAL_LIMITS.MAX_PINNED_FRIENDS} friends.`);
    }
    if (!(await this.graph.setPinned(viewerId, friendId, pinned ? this.clock.now() : null))) {
      throw new SocialError('not_found', 'This player is not on your friend list.');
    }
  }
}

/** Blocking removes the friendship and pending requests; the blocked player is not told. */
export class BlockPlayerUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly directory: IPlayerDirectory,
    private readonly notifier: InboxNotifier,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, targetIdInput: unknown): Promise<void> {
    const targetId = requireUserId(targetIdInput);
    if (targetId === viewerId) throw new SocialError('invalid_input', "You can't block yourself.");
    if (!(await this.directory.findById(targetId))) throw new SocialError('not_found', 'No such player.');
    if ((await this.graph.countBlocked(viewerId)) >= SOCIAL_LIMITS.MAX_BLOCKED_PLAYERS) {
      throw new SocialError('limit_reached', 'Your block list is full.');
    }
    await this.graph.block(viewerId, targetId, this.clock.now());
    // Open requests and invites from the blocked player disappear from the viewer's inbox.
    await Promise.all(
      (['friend_request', 'game_invite'] as const).map((kind) => this.notifier.withdraw(viewerId, kind, targetId, 'cancelled'))
    );
  }
}

export class UnblockPlayerUseCase {
  constructor(private readonly graph: ISocialGraphRepository) {}

  async execute(viewerId: string, targetIdInput: unknown): Promise<void> {
    await this.graph.unblock(viewerId, requireUserId(targetIdInput));
  }
}

export class ListBlockedPlayersUseCase {
  constructor(private readonly graph: ISocialGraphRepository) {}

  execute(viewerId: string): Promise<SocialPlayer[]> {
    return this.graph.listBlocked(viewerId);
  }
}
