import 'server-only';

import type { ITelemetryEventStore, TelemetryAppendResult } from '@shared/application';
import type { AnyTelemetryEnvelope } from '@shared/telemetry';

import { getSql } from '../db/neon';

/**
 * All statements read the batch from one JSON parameter and run in a single transaction (one HTTP
 * round trip). Every statement is idempotent, so a redelivered batch changes nothing.
 */
const BATCH = `jsonb_array_elements($1::jsonb) AS e`;
const AT = (expr: string) => `to_timestamp((${expr})::bigint / 1000.0)`;

const INSERT_EVENTS = `
  INSERT INTO telemetry_events (
    event_id, schema_version, type, occurred_at, room_id, game_id, seq, source, actor_id,
    correlation_id, command_type, round, phase, server_version, payload
  )
  SELECT
    (e->>'eventId')::uuid, (e->>'schemaVersion')::smallint, e->>'type', ${AT(`e->>'occurredAt'`)},
    e->>'roomId', (e->>'gameId')::uuid, (e->>'seq')::bigint, e->>'source', e->>'actorId',
    e->>'correlationId', e->>'commandType', (e->>'round')::smallint, e->>'phase', e->>'serverVersion',
    e->'payload'
  FROM ${BATCH}
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id`;

const PROJECT_GAME_STARTED = `
  INSERT INTO games (
    game_id, room_id, status, started_at, last_event_at, max_rounds, player_count, bot_count,
    host_id, ruleset, server_version
  )
  SELECT
    (e->>'gameId')::uuid, e->>'roomId', 'in_progress', ${AT(`e->>'occurredAt'`)}, ${AT(`e->>'occurredAt'`)},
    (e->'payload'->>'maxRounds')::smallint,
    jsonb_array_length(e->'payload'->'players'),
    (SELECT count(*) FROM jsonb_array_elements(e->'payload'->'players') p WHERE (p->>'isBot')::boolean),
    e->'payload'->>'hostId', e->'payload'->'ruleset', e->>'serverVersion'
  FROM ${BATCH}
  WHERE e->>'type' = 'game.started' AND e->>'gameId' IS NOT NULL
  ON CONFLICT (game_id) DO NOTHING`;

const PROJECT_GAME_PLAYERS = `
  INSERT INTO game_players (game_id, player_id, seat, name, is_bot, bot_difficulty)
  SELECT
    (e->>'gameId')::uuid, p->>'playerId', (p->>'seat')::smallint, p->>'name', (p->>'isBot')::boolean,
    (p->>'botDifficulty')::smallint
  FROM ${BATCH}, jsonb_array_elements(e->'payload'->'players') AS p
  WHERE e->>'type' = 'game.started' AND e->>'gameId' IS NOT NULL
  ON CONFLICT (game_id, player_id) DO NOTHING`;

const PROJECT_ROUNDS = `
  UPDATE games g SET rounds_completed = GREATEST(g.rounds_completed, x.round)
  FROM (
    SELECT (e->>'gameId')::uuid AS game_id, max((e->>'round')::smallint) AS round
    FROM ${BATCH}
    WHERE e->>'type' = 'round.completed' AND e->>'gameId' IS NOT NULL
    GROUP BY 1
  ) x
  WHERE g.game_id = x.game_id`;

const PROJECT_GAME_COMPLETED = `
  UPDATE games g SET
    status = 'completed',
    ended_at = ${AT(`e->>'occurredAt'`)},
    duration_ms = (e->'payload'->>'durationMs')::bigint,
    winner_id = e->'payload'->>'winnerId',
    end_reason = 'completed'
  FROM ${BATCH}
  WHERE e->>'type' = 'game.completed' AND g.game_id = (e->>'gameId')::uuid`;

const PROJECT_STANDINGS = `
  UPDATE game_players gp SET final_score = (s->>'score')::int, final_rank = (s->>'rank')::smallint
  FROM ${BATCH}, jsonb_array_elements(e->'payload'->'standings') AS s
  WHERE e->>'type' = 'game.completed'
    AND gp.game_id = (e->>'gameId')::uuid
    AND gp.player_id = s->>'playerId'`;

const PROJECT_GAME_ABANDONED = `
  UPDATE games g SET
    status = 'abandoned',
    ended_at = ${AT(`e->>'occurredAt'`)},
    duration_ms = (e->'payload'->>'durationMs')::bigint,
    end_reason = e->'payload'->>'reason'
  FROM ${BATCH}
  WHERE e->>'type' = 'game.abandoned' AND g.game_id = (e->>'gameId')::uuid AND g.status = 'in_progress'`;

const PROJECT_LAST_ACTIVITY = `
  UPDATE games g SET last_event_at = GREATEST(g.last_event_at, x.last_event_at)
  FROM (
    SELECT (e->>'gameId')::uuid AS game_id, ${AT(`max((e->>'occurredAt')::bigint)`)} AS last_event_at
    FROM ${BATCH}
    WHERE e->>'gameId' IS NOT NULL
    GROUP BY 1
  ) x
  WHERE g.game_id = x.game_id`;

const STATEMENTS = [
  INSERT_EVENTS,
  PROJECT_GAME_STARTED,
  PROJECT_GAME_PLAYERS,
  PROJECT_ROUNDS,
  PROJECT_GAME_COMPLETED,
  PROJECT_STANDINGS,
  PROJECT_GAME_ABANDONED,
  PROJECT_LAST_ACTIVITY,
];

export class PostgresTelemetryStore implements ITelemetryEventStore {
  async append(events: readonly AnyTelemetryEnvelope[]): Promise<TelemetryAppendResult> {
    if (events.length === 0) return { inserted: 0 };
    const sql = getSql();
    const json = JSON.stringify(events);
    const [inserted] = await sql.transaction(STATEMENTS.map((statement) => sql.query(statement, [json])));
    return { inserted: (inserted as unknown[]).length };
  }
}
