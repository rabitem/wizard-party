import 'server-only';

import { INBOX_KINDS, isInboxKind, type InboxAction, type InboxActor, type InboxItem } from '@shared/domain/social';
import type {
  IInboxRepository,
  InboxPageQuery,
  InboxSummary,
  SentGameInvitesQuery,
  SentInboxItem,
  StoredInboxDelivery,
} from '@shared/application/ports/social';

import { getSql } from '../db/neon';
import { toSocialPlayer, toTime, type SocialPlayerRow } from './social-player-row';

const at = (ms: number) => new Date(ms).toISOString();

interface InboxRow {
  id: string;
  kind: string;
  payload: unknown;
  created_at: string;
  read_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  resolution: InboxItem['resolution'];
  actor: SocialPlayerRow | null;
}

interface SentInboxRow extends InboxRow {
  recipient: SocialPlayerRow;
}

const toActor = (row: SocialPlayerRow): InboxActor => {
  const player = toSocialPlayer(row);
  return { userId: player.userId, username: player.username, displayName: player.displayName, avatar: player.avatar, appearance: player.appearance, level: player.level };
};

/** Rows of unknown kinds (written by a newer deploy) or with invalid payloads are skipped. */
function toItem(row: InboxRow): InboxItem | null {
  if (!isInboxKind(row.kind)) return null;
  const payload = INBOX_KINDS[row.kind].parsePayload(row.payload);
  if (payload === null) return null;
  return {
    id: row.id,
    kind: row.kind,
    payload,
    actor: row.actor ? toActor(row.actor) : null,
    createdAt: toTime(row.created_at) ?? 0,
    readAt: toTime(row.read_at),
    expiresAt: toTime(row.expires_at),
    resolvedAt: toTime(row.resolved_at),
    resolution: row.resolution,
  } as InboxItem;
}

function toSent(row: SentInboxRow): SentInboxItem | null {
  const item = toItem(row);
  return item && { item, recipient: toActor(row.recipient) };
}

export class PostgresInboxRepository implements IInboxRepository {
  async deliver({ delivery, dedupeKey, expiresAt, at: now }: StoredInboxDelivery): Promise<string> {
    const rows = (await getSql()`
      INSERT INTO inbox_items (user_id, kind, actor_id, dedupe_key, payload, created_at, expires_at)
      VALUES (
        ${delivery.userId}, ${delivery.kind}, ${delivery.actorId}, ${dedupeKey}, ${JSON.stringify(delivery.payload)}::jsonb,
        ${at(now)}, ${expiresAt === null ? null : at(expiresAt)}
      )
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO UPDATE SET
        payload = EXCLUDED.payload, created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at,
        read_at = NULL, resolved_at = NULL, resolution = NULL
      RETURNING id
    `) as { id: string }[];
    return rows[0].id;
  }

  async list(userId: string, { before, limit }: InboxPageQuery): Promise<InboxItem[]> {
    const rows = (await getSql()`
      SELECT i.id, i.kind, i.payload, i.created_at, i.read_at, i.expires_at, i.resolved_at, i.resolution,
        CASE WHEN sp.user_id IS NULL THEN NULL ELSE to_jsonb(sp) END AS actor
      FROM inbox_items i LEFT JOIN social_players sp ON sp.user_id = i.actor_id
      WHERE i.user_id = ${userId}
        AND (${before ? at(before.createdAt) : null}::timestamptz IS NULL
          OR (i.created_at, i.id) < (${before ? at(before.createdAt) : null}::timestamptz, ${before?.id ?? null}::uuid))
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT ${limit}
    `) as InboxRow[];
    return rows.flatMap((row) => toItem(row) ?? []);
  }

  async get(userId: string, id: string): Promise<InboxItem | null> {
    const rows = (await getSql()`
      SELECT i.id, i.kind, i.payload, i.created_at, i.read_at, i.expires_at, i.resolved_at, i.resolution,
        CASE WHEN sp.user_id IS NULL THEN NULL ELSE to_jsonb(sp) END AS actor
      FROM inbox_items i LEFT JOIN social_players sp ON sp.user_id = i.actor_id
      WHERE i.user_id = ${userId} AND i.id = ${id}::uuid
    `) as InboxRow[];
    return rows[0] ? toItem(rows[0]) : null;
  }

  /** Expired items never count as unread. */
  async summary(userId: string, now: number): Promise<InboxSummary> {
    const rows = (await getSql()`
      SELECT
        (SELECT count(*)::int FROM inbox_items
          WHERE user_id = ${userId} AND read_at IS NULL AND resolved_at IS NULL
            AND (expires_at IS NULL OR expires_at > ${at(now)})) AS unread,
        (SELECT max(created_at) FROM inbox_items WHERE user_id = ${userId}) AS latest_at
    `) as { unread: number; latest_at: string | null }[];
    return { unread: rows[0].unread, latestAt: toTime(rows[0].latest_at) };
  }

  async markRead(userId: string, ids: readonly string[] | 'all', now: number): Promise<number> {
    const rows =
      ids === 'all'
        ? await getSql()`UPDATE inbox_items SET read_at = ${at(now)} WHERE user_id = ${userId} AND read_at IS NULL RETURNING 1`
        : await getSql()`
            UPDATE inbox_items SET read_at = ${at(now)}
            WHERE user_id = ${userId} AND read_at IS NULL AND id = ANY(${ids as string[]}::uuid[])
            RETURNING 1
          `;
    return rows.length;
  }

  async resolve(userId: string, id: string, resolution: InboxAction | 'cancelled', now: number): Promise<boolean> {
    const rows = await getSql()`
      UPDATE inbox_items SET resolved_at = ${at(now)}, resolution = ${resolution}
      WHERE user_id = ${userId} AND id = ${id}::uuid AND resolved_at IS NULL
      RETURNING 1
    `;
    return rows.length > 0;
  }

  async resolveByKey(userId: string, dedupeKey: string, resolution: InboxAction | 'cancelled', now: number): Promise<void> {
    await getSql()`
      UPDATE inbox_items SET resolved_at = ${at(now)}, resolution = ${resolution}, read_at = COALESCE(read_at, ${at(now)})
      WHERE user_id = ${userId} AND dedupe_key = ${dedupeKey} AND resolved_at IS NULL
    `;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const rows = await getSql()`DELETE FROM inbox_items WHERE user_id = ${userId} AND id = ${id}::uuid RETURNING 1`;
    return rows.length > 0;
  }

  async prune(before: number): Promise<number> {
    const rows = (await getSql()`
      WITH deleted AS (DELETE FROM inbox_items WHERE created_at < ${at(before)} RETURNING 1)
      SELECT count(*)::int AS n FROM deleted
    `) as { n: number }[];
    return rows[0].n;
  }

  async listSentGameInvites(actorId: string, { roomCode, since, limit }: SentGameInvitesQuery): Promise<SentInboxItem[]> {
    const rows = (await getSql()`
      SELECT i.id, i.kind, i.payload, i.created_at, i.read_at, i.expires_at, i.resolved_at, i.resolution,
        CASE WHEN sp.user_id IS NULL THEN NULL ELSE to_jsonb(sp) END AS actor, to_jsonb(rp) AS recipient
      FROM inbox_items i
        JOIN social_players rp ON rp.user_id = i.user_id
        LEFT JOIN social_players sp ON sp.user_id = i.actor_id
      WHERE i.actor_id = ${actorId} AND i.kind = 'game_invite' AND i.payload->>'roomCode' = ${roomCode}
        AND i.created_at >= ${at(since)}
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT ${limit}
    `) as SentInboxRow[];
    return rows.flatMap((row) => toSent(row) ?? []);
  }

  async getSent(actorId: string, id: string): Promise<SentInboxItem | null> {
    const rows = (await getSql()`
      SELECT i.id, i.kind, i.payload, i.created_at, i.read_at, i.expires_at, i.resolved_at, i.resolution,
        CASE WHEN sp.user_id IS NULL THEN NULL ELSE to_jsonb(sp) END AS actor, to_jsonb(rp) AS recipient
      FROM inbox_items i
        JOIN social_players rp ON rp.user_id = i.user_id
        LEFT JOIN social_players sp ON sp.user_id = i.actor_id
      WHERE i.actor_id = ${actorId} AND i.id = ${id}::uuid
    `) as SentInboxRow[];
    return rows[0] ? toSent(rows[0]) : null;
  }

  async exportRaw(userId: string): Promise<unknown[]> {
    return getSql()`
      SELECT id, kind, actor_id, payload, created_at, read_at, expires_at, resolved_at, resolution
      FROM inbox_items WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
  }
}
