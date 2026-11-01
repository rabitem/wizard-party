-- Communication: email me about friend requests while I'm offline. Opt-out, so on for everyone,
-- existing accounts included (same as email_game_invites in 0105).
ALTER TABLE player_profiles
  ADD COLUMN email_friend_requests boolean NOT NULL DEFAULT true;

-- Same view as 0105 plus the new setting (appended: CREATE OR REPLACE VIEW only allows new
-- columns at the end).
CREATE OR REPLACE VIEW social_players AS
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
  COALESCE(p.email_game_invites, true)                                  AS email_game_invites,
  COALESCE(p.email_friend_requests, true)                               AS email_friend_requests
FROM auth_users u
LEFT JOIN player_profiles p ON p.user_id = u.id
LEFT JOIN player_progress pr ON pr.user_id = u.id
LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings';
