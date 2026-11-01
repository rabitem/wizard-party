-- Public player profiles at /u/<username>.
-- A profile is public only when the user has claimed a username AND is_public is true.
-- Recent games are listed publicly only when show_history is true (pinned games always are).

ALTER TABLE player_profiles
  ADD COLUMN is_public    boolean NOT NULL DEFAULT true,
  ADD COLUMN show_history boolean NOT NULL DEFAULT false;

-- Profile lookups use auth_users_username_uidx from 0102: the username plugin stores handles
-- normalized to lowercase, so no extra lower() index is needed.
