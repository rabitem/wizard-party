import 'server-only';

import type { FriendRequestView, RelationshipFacts, SocialPlayer } from '@shared/domain/social';
import type { FriendEdge, ISocialGraphRepository } from '@shared/application/ports/social';

import { getSql } from '../db/neon';
import { toSocialPlayer, toTime, type SocialPlayerRow, type SocialSettingsRow } from './social-player-row';

const at = (ms: number) => new Date(ms).toISOString();

interface FactsRow {
  is_friend: boolean;
  blocked_by_viewer: boolean;
  blocked_by_target: boolean;
  outgoing_exists: boolean;
  outgoing_declined_at: string | null;
  incoming_pending: boolean;
  target_policy: SocialSettingsRow['friend_request_policy'] | null;
  viewer_friends: number;
  target_friends: number;
  viewer_pending: number;
}

type EdgeRow = SocialPlayerRow & { since: string; pinned_at: string | null };
type RequestRow = SocialPlayerRow & { created_at: string };

export class PostgresSocialGraphRepository implements ISocialGraphRepository {
  async relationshipFacts(viewerId: string, targetId: string): Promise<RelationshipFacts> {
    const [row] = (await getSql()`
      SELECT
        EXISTS (SELECT 1 FROM friendships WHERE user_id = ${viewerId} AND friend_id = ${targetId}) AS is_friend,
        EXISTS (SELECT 1 FROM player_blocks WHERE user_id = ${viewerId} AND blocked_user_id = ${targetId}) AS blocked_by_viewer,
        EXISTS (SELECT 1 FROM player_blocks WHERE user_id = ${targetId} AND blocked_user_id = ${viewerId}) AS blocked_by_target,
        EXISTS (SELECT 1 FROM friend_requests WHERE from_user_id = ${viewerId} AND to_user_id = ${targetId}) AS outgoing_exists,
        (SELECT declined_at FROM friend_requests WHERE from_user_id = ${viewerId} AND to_user_id = ${targetId}) AS outgoing_declined_at,
        EXISTS (SELECT 1 FROM friend_requests WHERE from_user_id = ${targetId} AND to_user_id = ${viewerId} AND declined_at IS NULL) AS incoming_pending,
        (SELECT friend_request_policy FROM player_profiles WHERE user_id = ${targetId}) AS target_policy,
        (SELECT count(*)::int FROM friendships WHERE user_id = ${viewerId}) AS viewer_friends,
        (SELECT count(*)::int FROM friendships WHERE user_id = ${targetId}) AS target_friends,
        (SELECT count(*)::int FROM friend_requests WHERE from_user_id = ${viewerId}) AS viewer_pending
    `) as FactsRow[];
    return {
      isFriend: row.is_friend,
      blockedByViewer: row.blocked_by_viewer,
      blockedByTarget: row.blocked_by_target,
      outgoingRequest: row.outgoing_exists ? { declinedAt: toTime(row.outgoing_declined_at) } : null,
      incomingPending: row.incoming_pending,
      targetPolicy: row.target_policy ?? 'everyone',
      viewerFriendCount: row.viewer_friends,
      targetFriendCount: row.target_friends,
      viewerPendingOutgoing: row.viewer_pending,
    };
  }

  async createRequest(fromUserId: string, toUserId: string, now: number): Promise<void> {
    await getSql()`
      INSERT INTO friend_requests (from_user_id, to_user_id, created_at) VALUES (${fromUserId}, ${toUserId}, ${at(now)})
      ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET created_at = EXCLUDED.created_at, declined_at = NULL
    `;
  }

  /**
   * One statement: the request is consumed and both edges appear together, or nothing happens. The
   * friend cap is part of the same statement, so concurrent accepts can't overshoot it.
   */
  async acceptRequest(fromUserId: string, toUserId: string, now: number, maxFriends: number): Promise<'accepted' | 'missing' | 'full'> {
    const rows = (await getSql()`
      WITH pending AS (
        SELECT 1 FROM friend_requests
        WHERE from_user_id = ${fromUserId} AND to_user_id = ${toUserId} AND declined_at IS NULL
      ), room AS (
        SELECT (SELECT count(*) FROM friendships WHERE user_id = ${fromUserId}) < ${maxFriends}
           AND (SELECT count(*) FROM friendships WHERE user_id = ${toUserId}) < ${maxFriends} AS ok
      ), consumed AS (
        DELETE FROM friend_requests
        WHERE from_user_id = ${fromUserId} AND to_user_id = ${toUserId} AND declined_at IS NULL
          AND (SELECT ok FROM room)
        RETURNING from_user_id, to_user_id
      ), reverse AS (
        DELETE FROM friend_requests r USING consumed c
        WHERE r.from_user_id = c.to_user_id AND r.to_user_id = c.from_user_id
      ), edges AS (
        INSERT INTO friendships (user_id, friend_id, created_at)
        SELECT from_user_id, to_user_id, ${at(now)}::timestamptz FROM consumed
        UNION ALL SELECT to_user_id, from_user_id, ${at(now)}::timestamptz FROM consumed
        ON CONFLICT DO NOTHING
      )
      SELECT (SELECT count(*)::int FROM consumed) AS accepted, (SELECT count(*)::int FROM pending) AS pending
    `) as { accepted: number; pending: number }[];
    if (rows[0].accepted > 0) return 'accepted';
    return rows[0].pending > 0 ? 'full' : 'missing';
  }

  async declineRequest(fromUserId: string, toUserId: string, now: number): Promise<boolean> {
    const rows = await getSql()`
      UPDATE friend_requests SET declined_at = ${at(now)}
      WHERE from_user_id = ${fromUserId} AND to_user_id = ${toUserId} AND declined_at IS NULL
      RETURNING 1
    `;
    return rows.length > 0;
  }

  async cancelRequest(fromUserId: string, toUserId: string): Promise<boolean> {
    const rows = await getSql()`DELETE FROM friend_requests WHERE from_user_id = ${fromUserId} AND to_user_id = ${toUserId} RETURNING 1`;
    return rows.length > 0;
  }

  async removeFriendship(userId: string, friendId: string): Promise<boolean> {
    const rows = await getSql()`
      DELETE FROM friendships
      WHERE (user_id = ${userId} AND friend_id = ${friendId}) OR (user_id = ${friendId} AND friend_id = ${userId})
      RETURNING 1
    `;
    return rows.length > 0;
  }

  async setPinned(userId: string, friendId: string, pinnedAt: number | null): Promise<boolean> {
    const rows = await getSql()`
      UPDATE friendships SET pinned_at = ${pinnedAt === null ? null : at(pinnedAt)}
      WHERE user_id = ${userId} AND friend_id = ${friendId}
      RETURNING 1
    `;
    return rows.length > 0;
  }

  async countPinned(userId: string): Promise<number> {
    const rows = (await getSql()`SELECT count(*)::int AS n FROM friendships WHERE user_id = ${userId} AND pinned_at IS NOT NULL`) as { n: number }[];
    return rows[0].n;
  }

  async block(userId: string, targetId: string, now: number): Promise<void> {
    const sql = getSql();
    await sql.transaction([
      sql`INSERT INTO player_blocks (user_id, blocked_user_id, created_at) VALUES (${userId}, ${targetId}, ${at(now)}) ON CONFLICT DO NOTHING`,
      sql`DELETE FROM friendships WHERE (user_id = ${userId} AND friend_id = ${targetId}) OR (user_id = ${targetId} AND friend_id = ${userId})`,
      sql`DELETE FROM friend_requests WHERE from_user_id = ${userId} AND to_user_id = ${targetId}`,
      // The blocked player keeps seeing "Requested", exactly as after a decline.
      sql`UPDATE friend_requests SET declined_at = ${at(now)} WHERE from_user_id = ${targetId} AND to_user_id = ${userId} AND declined_at IS NULL`,
    ]);
  }

  async unblock(userId: string, targetId: string): Promise<boolean> {
    const rows = await getSql()`DELETE FROM player_blocks WHERE user_id = ${userId} AND blocked_user_id = ${targetId} RETURNING 1`;
    return rows.length > 0;
  }

  async countBlocked(userId: string): Promise<number> {
    const rows = (await getSql()`SELECT count(*)::int AS n FROM player_blocks WHERE user_id = ${userId}`) as { n: number }[];
    return rows[0].n;
  }

  async listFriends(userId: string): Promise<FriendEdge[]> {
    const rows = (await getSql()`
      SELECT sp.*, f.created_at AS since, f.pinned_at
      FROM friendships f JOIN social_players sp ON sp.user_id = f.friend_id
      WHERE f.user_id = ${userId}
    `) as EdgeRow[];
    return rows.map((row) => ({ player: toSocialPlayer(row), since: toTime(row.since) ?? 0, pinnedAt: toTime(row.pinned_at) }));
  }

  async listIncomingRequests(userId: string): Promise<FriendRequestView[]> {
    const rows = (await getSql()`
      SELECT sp.*, r.created_at FROM friend_requests r JOIN social_players sp ON sp.user_id = r.from_user_id
      WHERE r.to_user_id = ${userId} AND r.declined_at IS NULL
      ORDER BY r.created_at DESC
    `) as RequestRow[];
    return rows.map((row) => ({ player: toSocialPlayer(row), createdAt: toTime(row.created_at) ?? 0 }));
  }

  /** Includes silently declined requests: the sender is never told about a decline. */
  async listOutgoingRequests(userId: string): Promise<FriendRequestView[]> {
    const rows = (await getSql()`
      SELECT sp.*, r.created_at FROM friend_requests r JOIN social_players sp ON sp.user_id = r.to_user_id
      WHERE r.from_user_id = ${userId}
      ORDER BY r.created_at DESC
    `) as RequestRow[];
    return rows.map((row) => ({ player: toSocialPlayer(row), createdAt: toTime(row.created_at) ?? 0 }));
  }

  async listBlocked(userId: string): Promise<SocialPlayer[]> {
    const rows = (await getSql()`
      SELECT sp.* FROM player_blocks b JOIN social_players sp ON sp.user_id = b.blocked_user_id
      WHERE b.user_id = ${userId} ORDER BY b.created_at DESC
    `) as SocialPlayerRow[];
    return rows.map(toSocialPlayer);
  }

  async pruneDeclined(before: number): Promise<number> {
    const rows = (await getSql()`
      WITH deleted AS (DELETE FROM friend_requests WHERE declined_at < ${at(before)} RETURNING 1)
      SELECT count(*)::int AS n FROM deleted
    `) as { n: number }[];
    return rows[0].n;
  }

  async listDeclinedIncoming(userId: string): Promise<FriendRequestView[]> {
    const rows = (await getSql()`
      SELECT sp.*, r.created_at FROM friend_requests r JOIN social_players sp ON sp.user_id = r.from_user_id
      WHERE r.to_user_id = ${userId} AND r.declined_at IS NOT NULL
      ORDER BY r.created_at DESC
    `) as RequestRow[];
    return rows.map((row) => ({ player: toSocialPlayer(row), createdAt: toTime(row.created_at) ?? 0 }));
  }

  async friendIds(userId: string): Promise<string[]> {
    const rows = (await getSql()`SELECT friend_id FROM friendships WHERE user_id = ${userId}`) as { friend_id: string }[];
    return rows.map((row) => row.friend_id);
  }
}
