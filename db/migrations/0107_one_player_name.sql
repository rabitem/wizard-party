-- One name per account. The username is used to sign in, shown at the table and to friends,
-- searched by other players and used in /u/<username>; the separate profile display name and the
-- free-form Better Auth name go away. Renames are limited to one per 30 days ("usernameChangedAt",
-- enforced in src/infrastructure/auth/username-hooks.ts); the first rename is free.

ALTER TABLE auth_users ADD COLUMN "usernameChangedAt" timestamptz;

-- Accounts that never claimed a username get one from the name they played under (profile display
-- name, else the provider name; never the email). Same rules as deriveUsername() in
-- shared/domain/account/username.ts, with a random 4 digit suffix while the name is taken or
-- nothing usable is left ("Player1234").
DO $$
DECLARE
  account record;
  base text;
  candidate text;
  derived boolean;
  reserved constant text[] := ARRAY[
    'admin', 'administrator', 'api', 'account', 'accounts', 'auth', 'login', 'logout', 'signin', 'sign-in',
    'signup', 'settings', 'support', 'help', 'root', 'system', 'moderator', 'mod', 'staff', 'wizard',
    'wizardparty', 'official', 'null', 'undefined', 'me', 'u', 'profile', 'profiles'];
BEGIN
  FOR account IN
    SELECT u.id, COALESCE(NULLIF(btrim(p.display_name), ''), u.name, '') AS source
    FROM auth_users u
    LEFT JOIN player_profiles p ON p.user_id = u.id
    WHERE u."username" IS NULL
    ORDER BY u."createdAt", u.id
  LOOP
    base := regexp_replace(normalize(account.source, NFKD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g');
    base := regexp_replace(base, '\s+', '_', 'g');
    base := regexp_replace(base, '[^A-Za-z0-9_.]', '', 'g');
    base := regexp_replace(base, '\.{2,}', '.', 'g');
    base := regexp_replace(base, '^[._]+|[._]+$', '', 'g');
    base := regexp_replace(left(base, 16), '\.+$', '');
    derived := length(base) >= 3 AND NOT lower(base) = ANY (reserved);
    IF NOT derived THEN
      base := 'Player';
    END IF;

    candidate := CASE WHEN derived THEN base ELSE base || lpad(floor(random() * 10000)::int::text, 4, '0') END;
    WHILE EXISTS (SELECT 1 FROM auth_users WHERE "username" = lower(candidate)) LOOP
      candidate := base || lpad(floor(random() * 10000)::int::text, 4, '0');
    END LOOP;

    UPDATE auth_users SET "username" = lower(candidate), "displayUsername" = candidate WHERE id = account.id;
  END LOOP;
END $$;

-- The display casing must spell the username; Better Auth's required "name" mirrors it.
UPDATE auth_users SET "displayUsername" = "username"
WHERE "displayUsername" IS NULL OR lower("displayUsername") <> "username";
UPDATE auth_users SET name = "displayUsername" WHERE name IS DISTINCT FROM "displayUsername";

ALTER TABLE auth_users
  ALTER COLUMN "username" SET NOT NULL,
  ALTER COLUMN "displayUsername" SET NOT NULL;

-- Same columns as 0106; the name now comes from the username and every account has a profile URL.
CREATE OR REPLACE VIEW social_players AS
SELECT
  u.id                                                                  AS user_id,
  u."username"                                                          AS username,
  u."displayUsername"                                                   AS display_name,
  d.data ->> 'avatar'                                                   AS avatar,
  COALESCE(pr.total_xp, 0)                                              AS total_xp,
  COALESCE(p.is_public, true)                                           AS has_public_profile,
  COALESCE(p.invite_policy, 'everyone')                                 AS invite_policy,
  COALESCE(p.friend_request_policy, 'everyone')                         AS friend_request_policy,
  COALESCE(p.presence_mode, 'online')                                   AS presence_mode,
  COALESCE(p.email_game_invites, true)                                  AS email_game_invites,
  COALESCE(p.email_friend_requests, true)                               AS email_friend_requests
FROM auth_users u
LEFT JOIN player_profiles p ON p.user_id = u.id
LEFT JOIN player_progress pr ON pr.user_id = u.id
LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings';

-- Also drops player_profiles_display_name_trgm_idx.
ALTER TABLE player_profiles DROP COLUMN display_name;

-- Player search: name prefix (btree, no longer partial) and substring (trigram). Usernames are
-- stored lowercase, so neither needs lower().
DROP INDEX auth_users_username_prefix_idx;
CREATE INDEX auth_users_username_prefix_idx ON auth_users ("username" text_pattern_ops);
CREATE INDEX auth_users_username_trgm_idx ON auth_users USING gin ("username" gin_trgm_ops);
