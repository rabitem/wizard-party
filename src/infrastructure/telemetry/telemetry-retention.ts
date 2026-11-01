import 'server-only';

import { getSql } from '../db/neon';

/**
 * Storage periods of server-side game records promised in the privacy policy (/privacy, section 10).
 * Changing a value here requires updating the policy text as well. Browser telemetry has its own
 * period (CLIENT_TELEMETRY_BUDGETS.RETENTION_DAYS) enforced by PruneClientTelemetryUseCase.
 */
export const TELEMETRY_RETENTION = {
  CHAT_TEXT_DAYS: 30,
  RAW_USER_AGENT_DAYS: 90,
  REJECTED_COMMANDS_DAYS: 90,
  GAME_RECORDS_DAYS: 396, // 13 months
} as const;

/** Rows touched per statement and run; a daily run catches up gradually without long locks. */
const BATCH_SIZE = 20_000;

/** Server events whose payload carries the full user agent string. */
const USER_AGENT_EVENT_TYPES = ['client.connected', 'session.started'];

interface RetentionRule {
  name: string;
  /** Tables that must exist for the rule to run (migrations may not be applied everywhere yet). */
  requires: string[];
  sql: string;
}

const olderThan = (days: number) => `occurred_at < now() - interval '${days} days'`;

const RULES: RetentionRule[] = [
  {
    name: 'redact_chat_text',
    requires: ['telemetry_events'],
    sql: `UPDATE telemetry_events SET payload = (payload - 'message') || '{"messageRedacted": true}'::jsonb
          WHERE event_id IN (
            SELECT event_id FROM telemetry_events
            WHERE type = 'chat.sent' AND payload ? 'message' AND ${olderThan(TELEMETRY_RETENTION.CHAT_TEXT_DAYS)}
            LIMIT ${BATCH_SIZE})`,
  },
  {
    name: 'redact_user_agent',
    requires: ['telemetry_events'],
    sql: `UPDATE telemetry_events
          SET payload = payload - 'userAgent' #- '{device,userAgent}' #- '{client,userAgent}'
          WHERE event_id IN (
            SELECT event_id FROM telemetry_events
            WHERE type = ANY($1::text[])
              AND (payload ? 'userAgent' OR payload #> '{device,userAgent}' IS NOT NULL OR payload #> '{client,userAgent}' IS NOT NULL)
              AND ${olderThan(TELEMETRY_RETENTION.RAW_USER_AGENT_DAYS)}
            LIMIT ${BATCH_SIZE})`,
  },
  {
    name: 'delete_rejected_commands',
    requires: ['telemetry_events'],
    sql: `DELETE FROM telemetry_events WHERE event_id IN (
            SELECT event_id FROM telemetry_events
            WHERE type = 'command.rejected' AND ${olderThan(TELEMETRY_RETENTION.REJECTED_COMMANDS_DAYS)}
            LIMIT ${BATCH_SIZE})`,
  },
  {
    name: 'delete_game_events',
    requires: ['telemetry_events'],
    sql: `DELETE FROM telemetry_events WHERE event_id IN (
            SELECT event_id FROM telemetry_events WHERE ${olderThan(TELEMETRY_RETENTION.GAME_RECORDS_DAYS)}
            LIMIT ${BATCH_SIZE})`,
  },
  {
    name: 'delete_games',
    requires: ['games'],
    // game_players rows go with ON DELETE CASCADE.
    sql: `DELETE FROM games WHERE game_id IN (
            SELECT game_id FROM games
            WHERE last_event_at < now() - interval '${TELEMETRY_RETENTION.GAME_RECORDS_DAYS} days'
            LIMIT ${BATCH_SIZE})`,
  },
];

export interface RetentionResult {
  rule: string;
  rows: number;
}

/** Applies every retention rule once. Idempotent; safe to run concurrently with ingest. */
export async function applyTelemetryRetention(): Promise<RetentionResult[]> {
  const sql = getSql();
  const tables = new Set(
    (await sql.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    )).map((row) => row.table_name as string)
  );

  const results: RetentionResult[] = [];
  for (const rule of RULES) {
    if (!rule.requires.every((table) => tables.has(table))) continue;
    const params = rule.name === 'redact_user_agent' ? [USER_AGENT_EVENT_TYPES] : [];
    // Sequential on purpose: each statement is a bounded batch and order matters (redact before delete).
    // eslint-disable-next-line no-await-in-loop
    const result = await sql.query(rule.sql, params, { fullResults: true });
    results.push({ rule: rule.name, rows: result.rowCount ?? 0 });
  }
  return results;
}
