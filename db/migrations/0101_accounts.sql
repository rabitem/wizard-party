-- Player account data. Everything hangs off auth_users and is removed with it (GDPR erasure).

CREATE TABLE player_profiles (
  user_id      text        PRIMARY KEY REFERENCES auth_users (id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  tagline      text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Source of truth for stats, XP and achievements. Idempotent per client generated game id.
CREATE TABLE player_game_results (
  user_id        text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  client_game_id text        NOT NULL,
  played_at      timestamptz NOT NULL,
  player_count   smallint    NOT NULL CHECK (player_count BETWEEN 2 AND 6),
  placement      smallint    NOT NULL CHECK (placement >= 1 AND placement <= player_count),
  score          integer     NOT NULL,
  rounds         jsonb       NOT NULL,
  xp             integer     NOT NULL CHECK (xp >= 0),
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_game_id)
);

CREATE INDEX player_game_results_recent_idx ON player_game_results (user_id, played_at DESC);

-- Imported guest baseline plus a cached projection of the results (rebuildable at any time).
CREATE TABLE player_progress (
  user_id              text        PRIMARY KEY REFERENCES auth_users (id) ON DELETE CASCADE,
  baseline             jsonb,
  baseline_xp          integer     NOT NULL DEFAULT 0,
  baseline_imported_at timestamptz,
  summary              jsonb,
  total_xp             integer     NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_progress_xp_idx ON player_progress (total_xp DESC);

CREATE TABLE player_achievements (
  user_id        text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  achievement_id text        NOT NULL,
  unlocked_at    timestamptz NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- Synced client settings, one versioned JSON document per key (optimistic concurrency).
CREATE TABLE account_documents (
  user_id    text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  doc_key    text        NOT NULL,
  data       jsonb       NOT NULL,
  version    integer     NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, doc_key)
);

-- Metadata of uploaded custom sounds; the audio itself lives in blob storage.
CREATE TABLE account_custom_sounds (
  user_id          text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  sound_id         text        NOT NULL,
  name             text        NOT NULL,
  url              text        NOT NULL,
  storage_key      text        NOT NULL,
  size_bytes       integer     NOT NULL,
  duration_seconds real        NOT NULL,
  category         text        NOT NULL,
  roles            jsonb       NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sound_id)
);
