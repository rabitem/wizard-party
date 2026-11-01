-- Read-only conveniences over telemetry_events for the server facts added in telemetry
-- schema v1 (additive): connections & devices, chat, rejected commands. Views and indexes only;
-- telemetry_events stays the single source of truth.
--
-- command.rejected, chat.sent, emote.sent, client.connected and client.disconnected are rate
-- limited by the producer; dropped facts are counted in 'telemetry.suppressed' events.

-- Joins a connection's session.started with its client.disconnected.
CREATE INDEX telemetry_events_connection_idx
  ON telemetry_events (room_id, (payload ->> 'connectionId'), occurred_at)
  WHERE type IN ('client.connected', 'session.started', 'client.disconnected');

CREATE INDEX telemetry_events_rejected_command_idx
  ON telemetry_events ((payload ->> 'commandType'), (payload ->> 'errorCode'), occurred_at DESC)
  WHERE type = 'command.rejected';

-- One row per player session (a successful JOIN_GAME on a connection) with its device and,
-- once it ended, how long it lasted and how the socket closed.
CREATE VIEW player_sessions AS
SELECT
  s.room_id,
  s.payload ->> 'playerId'                         AS player_id,
  s.payload ->> 'connectionId'                     AS connection_id,
  s.occurred_at                                    AS started_at,
  d.occurred_at                                    AS ended_at,
  (d.payload ->> 'durationMs')::bigint             AS connection_duration_ms,
  (s.payload ->> 'isReconnect')::boolean           AS is_reconnect,
  s.payload ->> 'deviceType'                       AS device_type,
  s.payload ->> 'browserName'                      AS browser_name,
  s.payload ->> 'browserVersion'                   AS browser_version,
  s.payload ->> 'osName'                           AS os_name,
  s.payload ->> 'osVersion'                        AS os_version,
  s.payload ->> 'language'                         AS language,
  s.payload ->> 'country'                          AS country,
  s.payload ->> 'colo'                             AS colo,
  s.payload ->> 'clientVersion'                    AS client_version,
  (d.payload ->> 'closeCode')::int                 AS close_code,
  d.payload ->> 'closeReason'                      AS close_reason,
  s.server_version
FROM telemetry_events s
LEFT JOIN LATERAL (
  SELECT e.occurred_at, e.payload
  FROM telemetry_events e
  WHERE e.type = 'client.disconnected'
    AND e.room_id = s.room_id
    AND e.payload ->> 'connectionId' = s.payload ->> 'connectionId'
    AND e.occurred_at >= s.occurred_at
  ORDER BY e.occurred_at
  LIMIT 1
) d ON true
WHERE s.type = 'session.started';

-- Chat activity only: the text is never recorded (the privacy policy promises chat stays in memory).
CREATE VIEW chat_activity AS
SELECT
  e.room_id,
  e.game_id,
  e.occurred_at,
  e.phase,
  e.round,
  e.payload ->> 'playerId'          AS player_id,
  (e.payload ->> 'length')::int     AS message_length
FROM telemetry_events e
WHERE e.type = 'chat.sent';

CREATE VIEW rejected_commands AS
SELECT
  e.room_id,
  e.game_id,
  e.occurred_at,
  e.phase,
  e.round,
  e.actor_id,
  e.correlation_id,
  e.payload ->> 'commandType'                 AS command_type,
  e.payload ->> 'requestId'                   AS request_id,
  e.payload ->> 'errorCode'                   AS error_code,
  e.payload ->> 'errorName'                   AS error_name,
  e.payload ->> 'message'                     AS message,
  (e.payload ->> 'notifiedClient')::boolean   AS notified_client,
  e.server_version
FROM telemetry_events e
WHERE e.type = 'command.rejected';
