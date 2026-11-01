import { isPresenceMode, type PresenceMode } from './presence';

export const INVITE_POLICIES = ['everyone', 'friends', 'nobody'] as const;
export type InvitePolicy = (typeof INVITE_POLICIES)[number];

export const FRIEND_REQUEST_POLICIES = ['everyone', 'nobody'] as const;
export type FriendRequestPolicy = (typeof FRIEND_REQUEST_POLICIES)[number];

/** Per-player social privacy, edited in the account's profile tab. */
export interface SocialSettings {
  /** Who may invite this player to a game. */
  invitePolicy: InvitePolicy;
  /** Whether strangers may send friend requests. */
  friendRequestPolicy: FriendRequestPolicy;
  /** Chosen online status. */
  presenceMode: PresenceMode;
  /** Email about game invites that arrive while offline (opt-out). */
  emailGameInvites: boolean;
  /** Email about friend requests that arrive while offline (opt-out). */
  emailFriendRequests: boolean;
}

export const DEFAULT_SOCIAL_SETTINGS: Readonly<SocialSettings> = Object.freeze({
  invitePolicy: 'everyone',
  friendRequestPolicy: 'everyone',
  presenceMode: 'online',
  emailGameInvites: true,
  emailFriendRequests: true,
});

export type SocialSettingsChanges = Partial<SocialSettings>;

export type SocialSettingsError = 'invite_policy' | 'friend_request_policy' | 'presence_mode' | 'email_game_invites' | 'email_friend_requests';

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/** Validates untrusted changes; returns the parsed changes or the first invalid field. */
export function parseSocialSettingsChanges(input: Record<string, unknown>): SocialSettingsChanges | SocialSettingsError {
  const changes: SocialSettingsChanges = {};
  if (input.invitePolicy !== undefined) {
    if (!isOneOf(INVITE_POLICIES, input.invitePolicy)) return 'invite_policy';
    changes.invitePolicy = input.invitePolicy;
  }
  if (input.friendRequestPolicy !== undefined) {
    if (!isOneOf(FRIEND_REQUEST_POLICIES, input.friendRequestPolicy)) return 'friend_request_policy';
    changes.friendRequestPolicy = input.friendRequestPolicy;
  }
  if (input.presenceMode !== undefined) {
    if (!isPresenceMode(input.presenceMode)) return 'presence_mode';
    changes.presenceMode = input.presenceMode;
  }
  if (input.emailGameInvites !== undefined) {
    if (typeof input.emailGameInvites !== 'boolean') return 'email_game_invites';
    changes.emailGameInvites = input.emailGameInvites;
  }
  if (input.emailFriendRequests !== undefined) {
    if (typeof input.emailFriendRequests !== 'boolean') return 'email_friend_requests';
    changes.emailFriendRequests = input.emailFriendRequests;
  }
  return changes;
}

export function acceptsInviteFrom(policy: InvitePolicy, isFriend: boolean): boolean {
  if (policy === 'everyone') return true;
  return policy === 'friends' && isFriend;
}
