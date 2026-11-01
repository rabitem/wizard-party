-- Characters for the social features: the saved look (player_profiles.appearance, 0110) next to
-- the old avatar id. Readers show the saved look and fall back to one derived from `avatar`
-- (displayedAppearance in shared/domain/character). The column is appended: CREATE OR REPLACE
-- VIEW may only add columns at the end, so old code reading the view keeps working.

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
  COALESCE(p.email_friend_requests, true)                               AS email_friend_requests,
  p.appearance                                                          AS appearance
FROM auth_users u
LEFT JOIN player_profiles p ON p.user_id = u.id
LEFT JOIN player_progress pr ON pr.user_id = u.id
LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings';
