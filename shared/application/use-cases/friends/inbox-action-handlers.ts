import type { InboxKind } from '../../../domain/social';
import type { InboxActionHandler } from '../inbox/inbox.use-cases';
import type { RespondToFriendRequestUseCase } from './friend-requests.use-cases';
import { SocialError } from './social-error';

/** How the social features answer inbox actions; registered in the composition root. */
export function friendsInboxHandlers(respond: RespondToFriendRequestUseCase): Partial<Record<InboxKind, InboxActionHandler>> {
  return {
    friend_request: async (userId, item, action) => {
      if (!item.actor) throw new SocialError('not_found', 'This player no longer exists.');
      await respond.execute(userId, item.actor.userId, action === 'accept');
      return {};
    },
    game_invite: async (_userId, item, action) => {
      if (item.kind !== 'game_invite' || action !== 'accept') return {};
      return { navigateTo: `/lobby/${encodeURIComponent(item.payload.roomCode)}` };
    },
  };
}
