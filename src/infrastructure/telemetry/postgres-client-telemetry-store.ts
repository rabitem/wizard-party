import 'server-only';

import type {
  ClientTelemetryAppendResult,
  ClientTelemetryDeleteResult,
  IClientTelemetryRetention,
  IClientTelemetryStore,
} from '@shared/application';
import type { AnyClientTelemetryEnvelope, ClientTelemetryIngestContext } from '@shared/telemetry';

import { getSql } from '../db/neon';
import { buildClientSessionRows } from './client-session-projection';
import { toPostgresJson } from './postgres-json';

const AT = (expr: string) => `to_timestamp((${expr})::bigint / 1000.0)`;

/** $1 events, $2 received_at (epoch ms), $3 country, $4 request user agent. */
const INSERT_EVENTS = `
  INSERT INTO client_events (
    event_id, session_id, player_id, room_id, type, occurred_at, received_at, page, app_version,
    country, user_agent, payload
  )
  SELECT
    (e->>'eventId')::uuid, (e->>'sessionId')::uuid, e->>'playerId', e->>'roomId', e->>'type',
    ${AT(`e->>'occurredAt'`)}, ${AT('$2')}, e->>'page', e->>'appVersion', $3, $4, e->'payload'
  FROM jsonb_array_elements($1::jsonb) AS e
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id`;

/**
 * $1 session rows. Every assignment is idempotent (LEAST / GREATEST / COALESCE), so redelivered or
 * out-of-order batches converge to the same row.
 */
const UPSERT_SESSIONS = `
  INSERT INTO client_sessions AS s (
    session_id, first_seen, last_seen, player_id, app_version, browser, browser_version, os, os_version,
    device_type, screen_width, screen_height, viewport_width, viewport_height, device_pixel_ratio,
    cpu_cores, device_memory_gb, gpu_vendor, gpu_renderer, connection_type, language, timezone,
    country, user_agent
  )
  SELECT
    r.session_id, ${AT('r.first_seen')}, ${AT('r.last_seen')}, r.player_id, r.app_version, r.browser,
    r.browser_version, r.os, r.os_version, r.device_type, r.screen_width, r.screen_height,
    r.viewport_width, r.viewport_height, r.device_pixel_ratio, r.cpu_cores, r.device_memory_gb,
    r.gpu_vendor, r.gpu_renderer, r.connection_type, r.language, r.timezone, r.country, r.user_agent
  FROM jsonb_to_recordset($1::jsonb) AS r(
    session_id uuid, first_seen bigint, last_seen bigint, player_id text, app_version text,
    browser text, browser_version text, os text, os_version text, device_type text,
    screen_width integer, screen_height integer, viewport_width integer, viewport_height integer,
    device_pixel_ratio real, cpu_cores smallint, device_memory_gb real, gpu_vendor text,
    gpu_renderer text, connection_type text, language text, timezone text, country text, user_agent text
  )
  ON CONFLICT (session_id) DO UPDATE SET
    first_seen         = LEAST(s.first_seen, EXCLUDED.first_seen),
    last_seen          = GREATEST(s.last_seen, EXCLUDED.last_seen),
    player_id          = COALESCE(EXCLUDED.player_id, s.player_id),
    app_version        = CASE WHEN EXCLUDED.last_seen >= s.last_seen THEN EXCLUDED.app_version ELSE s.app_version END,
    browser            = COALESCE(EXCLUDED.browser, s.browser),
    browser_version    = COALESCE(EXCLUDED.browser_version, s.browser_version),
    os                 = COALESCE(EXCLUDED.os, s.os),
    os_version         = COALESCE(EXCLUDED.os_version, s.os_version),
    device_type        = COALESCE(EXCLUDED.device_type, s.device_type),
    screen_width       = COALESCE(EXCLUDED.screen_width, s.screen_width),
    screen_height      = COALESCE(EXCLUDED.screen_height, s.screen_height),
    viewport_width     = COALESCE(EXCLUDED.viewport_width, s.viewport_width),
    viewport_height    = COALESCE(EXCLUDED.viewport_height, s.viewport_height),
    device_pixel_ratio = COALESCE(EXCLUDED.device_pixel_ratio, s.device_pixel_ratio),
    cpu_cores          = COALESCE(EXCLUDED.cpu_cores, s.cpu_cores),
    device_memory_gb   = COALESCE(EXCLUDED.device_memory_gb, s.device_memory_gb),
    gpu_vendor         = COALESCE(EXCLUDED.gpu_vendor, s.gpu_vendor),
    gpu_renderer       = COALESCE(EXCLUDED.gpu_renderer, s.gpu_renderer),
    connection_type    = COALESCE(EXCLUDED.connection_type, s.connection_type),
    language           = COALESCE(EXCLUDED.language, s.language),
    timezone           = COALESCE(EXCLUDED.timezone, s.timezone),
    country            = COALESCE(EXCLUDED.country, s.country),
    user_agent         = COALESCE(EXCLUDED.user_agent, s.user_agent)`;

/** $1 cutoff (epoch ms), $2 row limit. Bounded deletes along the occurred_at / last_seen indexes. */
const DELETE_OLD_EVENTS = `
  WITH doomed AS (
    SELECT event_id FROM client_events WHERE occurred_at < ${AT('$1')} ORDER BY occurred_at LIMIT $2
  )
  DELETE FROM client_events e USING doomed d WHERE e.event_id = d.event_id
  RETURNING e.event_id`;

const DELETE_OLD_SESSIONS = `
  WITH doomed AS (
    SELECT session_id FROM client_sessions WHERE last_seen < ${AT('$1')} ORDER BY last_seen LIMIT $2
  )
  DELETE FROM client_sessions s USING doomed d WHERE s.session_id = d.session_id
  RETURNING s.session_id`;

/** Append statements run in one transaction, i.e. one HTTP round trip to Neon. */
export class PostgresClientTelemetryStore implements IClientTelemetryStore, IClientTelemetryRetention {
  async append(
    events: readonly AnyClientTelemetryEnvelope[],
    context: ClientTelemetryIngestContext
  ): Promise<ClientTelemetryAppendResult> {
    if (events.length === 0) return { inserted: 0 };
    const sql = getSql();
    const sessions = buildClientSessionRows(events, context);
    const [inserted] = await sql.transaction([
      sql.query(INSERT_EVENTS, [toPostgresJson(events), context.receivedAt, context.country, context.userAgent]),
      sql.query(UPSERT_SESSIONS, [toPostgresJson(sessions)]),
    ]);
    return { inserted: (inserted as unknown[]).length };
  }

  async deleteOlderThan(cutoff: number, limit: number): Promise<ClientTelemetryDeleteResult> {
    const sql = getSql();
    const [events, sessions] = await sql.transaction([
      sql.query(DELETE_OLD_EVENTS, [cutoff, limit]),
      sql.query(DELETE_OLD_SESSIONS, [cutoff, limit]),
    ]);
    return { events: (events as unknown[]).length, sessions: (sessions as unknown[]).length };
  }
}
