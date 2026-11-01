-- Browser telemetry (collected only with analytics consent). Append-only, one row per client event.
-- No IP addresses are stored; country is resolved at the edge. Rows older than the retention period
-- (CLIENT_TELEMETRY_BUDGETS.RETENTION_DAYS) are deleted by the daily /api/telemetry/client/retention cron.
CREATE TABLE client_events (
  event_id     uuid PRIMARY KEY,
  session_id   uuid        NOT NULL,
  player_id    text,
  room_id      text,
  type         text        NOT NULL,
  occurred_at  timestamptz NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  page         text        NOT NULL,
  app_version  text        NOT NULL,
  country      text,
  user_agent   text,
  payload      jsonb       NOT NULL
);

CREATE INDEX client_events_session_idx  ON client_events (session_id, occurred_at);
CREATE INDEX client_events_player_idx   ON client_events (player_id, occurred_at DESC) WHERE player_id IS NOT NULL;
CREATE INDEX client_events_room_idx     ON client_events (room_id, occurred_at) WHERE room_id IS NOT NULL;
CREATE INDEX client_events_type_idx     ON client_events (type, occurred_at DESC);
CREATE INDEX client_events_occurred_idx ON client_events (occurred_at DESC);
-- Join command round trips with the server events they caused (telemetry_events.correlation_id).
CREATE INDEX client_events_request_idx  ON client_events ((payload ->> 'requestId'))
  WHERE type = 'command.rtt';

-- Read model: one row per browser tab session, upserted idempotently by the ingest transaction.
CREATE TABLE client_sessions (
  session_id        uuid PRIMARY KEY,
  first_seen        timestamptz NOT NULL,
  last_seen         timestamptz NOT NULL,
  player_id         text,
  app_version       text,
  browser           text,
  browser_version   text,
  os                text,
  os_version        text,
  device_type       text CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  screen_width      integer,
  screen_height     integer,
  viewport_width    integer,
  viewport_height   integer,
  device_pixel_ratio real,
  cpu_cores         smallint,
  device_memory_gb  real,
  gpu_vendor        text,
  gpu_renderer      text,
  connection_type   text,
  language          text,
  timezone          text,
  country           text,
  user_agent        text
);

CREATE INDEX client_sessions_player_idx    ON client_sessions (player_id, last_seen DESC) WHERE player_id IS NOT NULL;
CREATE INDEX client_sessions_first_seen_idx ON client_sessions (first_seen DESC);
-- Retention deletes sessions by last activity.
CREATE INDEX client_sessions_last_seen_idx  ON client_sessions (last_seen);
