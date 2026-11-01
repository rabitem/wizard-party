-- Append-only event log: the source of truth. Everything else is a projection and can be rebuilt.
CREATE TABLE telemetry_events (
  event_id        uuid PRIMARY KEY,
  schema_version  smallint    NOT NULL,
  type            text        NOT NULL,
  occurred_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  room_id         text        NOT NULL,
  game_id         uuid,
  seq             bigint      NOT NULL,
  source          text        NOT NULL CHECK (source IN ('player', 'bot', 'system')),
  actor_id        text,
  correlation_id  text        NOT NULL,
  command_type    text,
  round           smallint,
  phase           text        NOT NULL,
  server_version  text,
  payload         jsonb       NOT NULL
);

CREATE INDEX telemetry_events_game_seq_idx    ON telemetry_events (game_id, seq) WHERE game_id IS NOT NULL;
CREATE INDEX telemetry_events_room_seq_idx    ON telemetry_events (room_id, seq);
CREATE INDEX telemetry_events_occurred_idx    ON telemetry_events (occurred_at DESC);
CREATE INDEX telemetry_events_type_idx        ON telemetry_events (type, occurred_at DESC);
CREATE INDEX telemetry_events_actor_idx       ON telemetry_events (actor_id, occurred_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX telemetry_events_correlation_idx ON telemetry_events (correlation_id);

-- Read model: one row per game, maintained idempotently by the ingest transaction.
CREATE TABLE games (
  game_id          uuid PRIMARY KEY,
  room_id          text        NOT NULL,
  status           text        NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  last_event_at    timestamptz NOT NULL,
  duration_ms      bigint,
  max_rounds       smallint    NOT NULL,
  rounds_completed smallint    NOT NULL DEFAULT 0,
  player_count     smallint    NOT NULL,
  bot_count        smallint    NOT NULL,
  host_id          text,
  winner_id        text,
  end_reason       text,
  ruleset          jsonb,
  server_version   text
);

CREATE INDEX games_started_idx ON games (started_at DESC);
CREATE INDEX games_status_idx  ON games (status, started_at DESC);
CREATE INDEX games_room_idx    ON games (room_id, started_at DESC);

CREATE TABLE game_players (
  game_id        uuid     NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
  player_id      text     NOT NULL,
  seat           smallint NOT NULL,
  name           text     NOT NULL,
  is_bot         boolean  NOT NULL,
  bot_difficulty smallint,
  final_score    integer,
  final_rank     smallint,
  PRIMARY KEY (game_id, player_id)
);

CREATE INDEX game_players_player_idx ON game_players (player_id);

-- Convenience view for ad-hoc analysis of individual moves.
CREATE VIEW game_moves AS
SELECT
  e.game_id,
  e.seq,
  e.occurred_at,
  e.round,
  e.type,
  e.source,
  e.actor_id,
  e.correlation_id,
  e.payload ->> 'bid'                  AS bid,
  e.payload -> 'card' ->> 'id'         AS card_id,
  (e.payload ->> 'trickNumber')::int   AS trick_number,
  e.payload ->> 'suit'                 AS trump_suit
FROM telemetry_events e
WHERE e.type IN ('trump.selected', 'bid.placed', 'card.played');
