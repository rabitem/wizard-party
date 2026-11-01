import type { SocialRateLimitedAction } from './social.constants';
import type { SocialSettings } from './social-privacy';

/**
 * Email is a second channel for selected inbox kinds. Each category has its own opt-out setting
 * (on by default), its own one-click unsubscribe link and its own anti-spam budgets. A new
 * emailed kind adds a category here, a setting column, a template and a notify use case.
 */
export const EMAIL_CATEGORIES = ['game_invites', 'friend_requests'] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

type EmailSettingKey = { [K in keyof SocialSettings]: SocialSettings[K] extends boolean ? K : never }[keyof SocialSettings];

export interface EmailCategoryDefinition {
  /** The opt-out setting that governs this category. */
  setting: EmailSettingKey;
  /** Budgets checked in order, keyed by who they limit. */
  budgets: readonly { action: SocialRateLimitedAction; subject: 'pair' | 'sender' | 'recipient' }[];
  /**
   * How unverified addresses are treated: 'skip' never mails them; a budget mails them within
   * that extra per-recipient budget (and the mail says what to do if the account isn't theirs).
   */
  unverified: 'skip' | { budget: SocialRateLimitedAction };
  /** Shown on the unsubscribe page. */
  label: string;
}

export const EMAIL_CATEGORY_DEFINITIONS: Record<EmailCategory, EmailCategoryDefinition> = {
  game_invites: {
    setting: 'emailGameInvites',
    budgets: [
      { action: 'invite_email_pair', subject: 'pair' },
      { action: 'invite_email_sender', subject: 'sender' },
      { action: 'invite_email', subject: 'recipient' },
    ],
    // Many accounts predate email verification; they still hear about their friends' invites.
    unverified: { budget: 'invite_email_unverified' },
    label: 'game invite emails',
  },
  friend_requests: {
    setting: 'emailFriendRequests',
    budgets: [
      { action: 'friend_request_email_sender', subject: 'sender' },
      { action: 'friend_request_email', subject: 'recipient' },
    ],
    // Many accounts predate email verification; they should still hear about friend requests.
    unverified: { budget: 'friend_request_email_unverified' },
    label: 'friend request emails',
  },
};

export function isEmailCategory(value: unknown): value is EmailCategory {
  return typeof value === 'string' && (EMAIL_CATEGORIES as readonly string[]).includes(value);
}
