-- Characters: the look a player chose in the character editor (see shared/domain/character).
-- NULL until they save one; until then the server derives a look from the avatar in their synced
-- game-settings document, so existing players need no backfill. Unlocks are derived from
-- progress and never stored here.

ALTER TABLE player_profiles
  ADD COLUMN appearance jsonb;
