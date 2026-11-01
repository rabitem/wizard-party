-- Friends, friend requests, blocks, a generic inbox and social privacy settings.
-- Everything hangs off auth_users and is removed with it (GDPR erasure).

-- Directed edges: a friendship is two rows, so per-viewer state (pins) needs no extra table and
-- "my friends" is a single index range scan on the primary key.
CREATE TABLE friendships (
  user_id    text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  friend_id  text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  pinned_at  timestamptz,
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- Pending requests. A declined request stays (declined_at) as a re-request cooldown.
CREATE TABLE friend_requests (
  from_user_id text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  to_user_id   text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  declined_at  timestamptz,
  PRIMARY KEY (from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX friend_requests_incoming_idx ON friend_requests (to_user_id, created_at DESC) WHERE declined_at IS NULL;

CREATE TABLE player_blocks (
  user_id         text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  blocked_user_id text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, blocked_user_id),
  CHECK (user_id <> blocked_user_id)
);

CREATE INDEX player_blocks_blocked_idx ON player_blocks (blocked_user_id);

-- Generic inbox: one row per notification, typed by `kind` with a JSON payload validated by the
-- domain. `dedupe_key` collapses repeats (one pending invite per sender) into one row.
CREATE TABLE inbox_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  kind        text        NOT NULL,
  actor_id    text        REFERENCES auth_users (id) ON DELETE CASCADE,
  dedupe_key  text,
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  expires_at  timestamptz,
  resolved_at timestamptz,
  resolution  text
);

CREATE UNIQUE INDEX inbox_items_dedupe_uidx ON inbox_items (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
-- Keyset pagination (newest first) and the unread counter.
CREATE INDEX inbox_items_feed_idx ON inbox_items (user_id, created_at DESC, id DESC);
CREATE INDEX inbox_items_unread_idx ON inbox_items (user_id) WHERE read_at IS NULL;
CREATE INDEX inbox_items_actor_idx ON inbox_items (actor_id) WHERE actor_id IS NOT NULL;

-- Social privacy. Profiles are created lazily, so readers COALESCE to the domain defaults.
ALTER TABLE player_profiles
  ADD COLUMN invite_policy         text NOT NULL DEFAULT 'everyone' CHECK (invite_policy IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN friend_request_policy text NOT NULL DEFAULT 'everyone' CHECK (friend_request_policy IN ('everyone', 'nobody')),
  ADD COLUMN presence_mode         text NOT NULL DEFAULT 'online' CHECK (presence_mode IN ('online', 'away', 'busy', 'invisible')),
  -- Communication: email me about game invites while I'm offline. Opt-out, so on for everyone.
  ADD COLUMN email_game_invites    boolean NOT NULL DEFAULT true;

-- Player search: handle prefix (exact handles also find private profiles) and fuzzy display names.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX auth_users_username_prefix_idx ON auth_users ("username" text_pattern_ops) WHERE "username" IS NOT NULL;
CREATE INDEX player_profiles_display_name_trgm_idx ON player_profiles USING gin (lower(display_name) gin_trgm_ops);

-- A player as the social features show them (no email, nothing private) plus their settings.
-- Every social read joins through this view, so the "what leaves the server" whitelist and the
-- defaults of lazily created profiles live in one place.
CREATE VIEW social_players AS
SELECT
  u.id                                                                  AS user_id,
  u."username"                                                          AS username,
  COALESCE(NULLIF(p.display_name, ''), u."displayUsername", u."username", 'Wizard') AS display_name,
  d.data ->> 'avatar'                                                   AS avatar,
  COALESCE(pr.total_xp, 0)                                              AS total_xp,
  (u."username" IS NOT NULL AND COALESCE(p.is_public, true))            AS has_public_profile,
  COALESCE(p.invite_policy, 'everyone')                                 AS invite_policy,
  COALESCE(p.friend_request_policy, 'everyone')                         AS friend_request_policy,
  COALESCE(p.presence_mode, 'online')                                   AS presence_mode,
  COALESCE(p.email_game_invites, true)                                  AS email_game_invites
FROM auth_users u
LEFT JOIN player_profiles p ON p.user_id = u.id
LEFT JOIN player_progress pr ON pr.user_id = u.id
LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings';
