import 'server-only';

import type { PlayerSearchResult, SocialPlayer, SocialSettings, SocialSettingsChanges } from '@shared/domain/social';
import type { EmailContact, IPlayerDirectory } from '@shared/application/ports/social';

import { getSql } from '../db/neon';
import {
  escapeLike,
  toSearchResult,
  toSocialPlayer,
  toSocialSettings,
  type RelationshipRow,
  type SocialPlayerRow,
  type SocialSettingsRow,
} from './social-player-row';

/** Upper bound of candidates per search branch before ranking. */
const SEARCH_CANDIDATES = 25;

export class PostgresPlayerDirectory implements IPlayerDirectory {
  async findById(userId: string): Promise<SocialPlayer | null> {
    const rows = (await getSql()`SELECT * FROM social_players WHERE user_id = ${userId}`) as SocialPlayerRow[];
    return rows[0] ? toSocialPlayer(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<SocialPlayer | null> {
    const rows = (await getSql()`SELECT * FROM social_players WHERE username = ${username}`) as SocialPlayerRow[];
    return rows[0] ? toSocialPlayer(rows[0]) : null;
  }

  /**
   * Three ranked branches, each served by an index: exact name (also private profiles, so friends
   * can add each other by name), name prefix and name substring (public profiles only).
   */
  async search(viewerId: string, query: string, limit: number): Promise<PlayerSearchResult[]> {
    const escaped = escapeLike(query);
    const rows = (await getSql()`
      WITH hits AS (
        (SELECT u.id, CASE WHEN u."username" = ${query} THEN 0 ELSE 1 END AS rank
         FROM auth_users u LEFT JOIN player_profiles p ON p.user_id = u.id
         WHERE u."username" LIKE ${`${escaped}%`}
           AND (u."username" = ${query} OR COALESCE(p.is_public, true))
         ORDER BY u."username" LIMIT ${SEARCH_CANDIDATES})
        UNION ALL
        (SELECT u.id, 2 AS rank
         FROM auth_users u LEFT JOIN player_profiles p ON p.user_id = u.id
         WHERE u."username" LIKE ${`%${escaped}%`} AND COALESCE(p.is_public, true)
         LIMIT ${SEARCH_CANDIDATES})
      ), best AS (SELECT id, min(rank) AS rank FROM hits GROUP BY id)
      SELECT sp.*,
        EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = ${viewerId} AND f.friend_id = sp.user_id) AS is_friend,
        EXISTS (SELECT 1 FROM player_blocks b WHERE b.user_id = ${viewerId} AND b.blocked_user_id = sp.user_id) AS blocked_by_viewer,
        EXISTS (SELECT 1 FROM friend_requests r WHERE r.from_user_id = ${viewerId} AND r.to_user_id = sp.user_id) AS has_outgoing_request,
        EXISTS (SELECT 1 FROM friend_requests r WHERE r.from_user_id = sp.user_id AND r.to_user_id = ${viewerId} AND r.declined_at IS NULL) AS incoming_pending
      FROM best JOIN social_players sp ON sp.user_id = best.id
      WHERE sp.user_id <> ${viewerId}
        AND NOT EXISTS (SELECT 1 FROM player_blocks b WHERE b.user_id = sp.user_id AND b.blocked_user_id = ${viewerId})
      ORDER BY best.rank, sp.total_xp DESC, sp.display_name
      LIMIT ${limit}
    `) as (SocialPlayerRow & RelationshipRow)[];
    return rows.map(toSearchResult);
  }

  async findManyForViewer(viewerId: string, userIds: readonly string[]): Promise<PlayerSearchResult[]> {
    if (userIds.length === 0) return [];
    const rows = (await getSql()`
      SELECT sp.*,
        EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = ${viewerId} AND f.friend_id = sp.user_id) AS is_friend,
        EXISTS (SELECT 1 FROM player_blocks b WHERE b.user_id = ${viewerId} AND b.blocked_user_id = sp.user_id) AS blocked_by_viewer,
        EXISTS (SELECT 1 FROM friend_requests r WHERE r.from_user_id = ${viewerId} AND r.to_user_id = sp.user_id) AS has_outgoing_request,
        EXISTS (SELECT 1 FROM friend_requests r WHERE r.from_user_id = sp.user_id AND r.to_user_id = ${viewerId} AND r.declined_at IS NULL) AS incoming_pending
      FROM social_players sp
      WHERE sp.user_id = ANY(${userIds as string[]}::text[])
        AND NOT EXISTS (SELECT 1 FROM player_blocks b WHERE b.user_id = sp.user_id AND b.blocked_user_id = ${viewerId})
    `) as (SocialPlayerRow & RelationshipRow)[];
    return rows.map(toSearchResult);
  }

  async emailContact(userId: string): Promise<EmailContact | null> {
    const rows = (await getSql()`SELECT email, "emailVerified" AS verified FROM auth_users WHERE id = ${userId}`) as EmailContact[];
    return rows[0]?.email ? rows[0] : null;
  }

  async getSettings(userId: string): Promise<SocialSettings> {
    const rows = (await getSql()`
      SELECT invite_policy, friend_request_policy, presence_mode, email_game_invites, email_friend_requests
      FROM player_profiles WHERE user_id = ${userId}
    `) as SocialSettingsRow[];
    return toSocialSettings(rows[0]);
  }

  /** The profile row must exist (EnsureProfile, owned by the account context). */
  async updateSettings(userId: string, changes: SocialSettingsChanges): Promise<SocialSettings> {
    const rows = (await getSql()`
      UPDATE player_profiles SET
        invite_policy = COALESCE(${changes.invitePolicy ?? null}, invite_policy),
        friend_request_policy = COALESCE(${changes.friendRequestPolicy ?? null}, friend_request_policy),
        presence_mode = COALESCE(${changes.presenceMode ?? null}, presence_mode),
        email_game_invites = COALESCE(${changes.emailGameInvites ?? null}::boolean, email_game_invites),
        email_friend_requests = COALESCE(${changes.emailFriendRequests ?? null}::boolean, email_friend_requests),
        updated_at = now()
      WHERE user_id = ${userId}
      RETURNING invite_policy, friend_request_policy, presence_mode, email_game_invites, email_friend_requests
    `) as SocialSettingsRow[];
    return toSocialSettings(rows[0]);
  }
}
