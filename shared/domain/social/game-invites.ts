import { inboxItemState, type InboxItem } from './inbox';

/** How a sent game invite looks from the sender's side. */
export type SentInviteState = 'pending' | 'seen' | 'accepted' | 'declined' | 'expired' | 'revoked';

/**
 * The sender's view of an invite: open ones are `pending` until the recipient read them (`seen`),
 * answered ones show the answer, and a `cancelled` one was withdrawn (`revoked`).
 */
export function sentInviteState(item: InboxItem, now: number): SentInviteState {
  switch (inboxItemState(item, now)) {
    case 'resolved':
      if (item.resolution === 'accept') return 'accepted';
      if (item.resolution === 'decline') return 'declined';
      return 'revoked';
    case 'expired':
      return 'expired';
    default:
      return item.readAt === null ? 'pending' : 'seen';
  }
}

/** Only an invite the recipient can still act on can be revoked. */
export function canRevokeInvite(item: InboxItem, now: number): boolean {
  return inboxItemState(item, now) === 'actionable';
}
