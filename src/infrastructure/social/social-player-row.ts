import 'server-only';

import { getProgression } from '@shared/domain/account';
import { displayedAppearance } from '@shared/domain/character';
import { DEFAULT_SOCIAL_SETTINGS, relationshipOf, type PlayerSearchResult, type SocialPlayer, type SocialSettings } from '@shared/domain/social';

/** Columns of the `social_players` view (db/migrations/0111_social_players_appearance.sql). */
export interface SocialPlayerRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  total_xp: number | string;
  has_public_profile: boolean;
  /** player_profiles.appearance: untrusted JSON, or null while none was saved. */
  appearance: unknown;
}

export interface SocialSettingsRow {
  invite_policy: SocialSettings['invitePolicy'];
  friend_request_policy: SocialSettings['friendRequestPolicy'];
  presence_mode: SocialSettings['presenceMode'];
  email_game_invites: boolean;
  email_friend_requests: boolean;
}

/** Relationship flags selected next to a player, from the viewer's side. */
export interface RelationshipRow {
  is_friend: boolean;
  blocked_by_viewer: boolean;
  has_outgoing_request: boolean;
  incoming_pending: boolean;
}

export const toTime = (value: string | Date | null): number | null => (value === null ? null : new Date(value).getTime());

export function toSocialPlayer(row: SocialPlayerRow): SocialPlayer {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    appearance: displayedAppearance(row.appearance, row.avatar),
    level: getProgression(Number(row.total_xp) || 0).level,
    hasPublicProfile: row.has_public_profile,
  };
}

export function toSearchResult(row: SocialPlayerRow & RelationshipRow): PlayerSearchResult {
  return {
    ...toSocialPlayer(row),
    relationship: relationshipOf({
      isFriend: row.is_friend,
      blockedByViewer: row.blocked_by_viewer,
      hasOutgoingRequest: row.has_outgoing_request,
      incomingPending: row.incoming_pending,
    }),
  };
}

export function toSocialSettings(row: SocialSettingsRow | undefined): SocialSettings {
  if (!row) return { ...DEFAULT_SOCIAL_SETTINGS };
  return {
    invitePolicy: row.invite_policy,
    friendRequestPolicy: row.friend_request_policy,
    presenceMode: row.presence_mode,
    emailGameInvites: row.email_game_invites,
    emailFriendRequests: row.email_friend_requests,
  };
}

/** Escapes LIKE wildcards so user input only ever matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
