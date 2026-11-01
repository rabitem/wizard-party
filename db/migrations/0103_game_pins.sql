-- Pinned games ("trophy shelf") and keyset-paginated game history.

ALTER TABLE player_game_results ADD COLUMN pinned_at timestamptz;

-- Pinned games of a user, most recently pinned first. Partial: only a handful of rows per user.
CREATE INDEX player_game_results_pinned_idx
  ON player_game_results (user_id, pinned_at DESC)
  WHERE pinned_at IS NOT NULL;

-- Keyset pagination orders by (played_at, client_game_id) DESC; the tiebreaker must be in the
-- index so `(played_at, client_game_id) < (...)` is an index range scan (scanned backwards).
-- It supersedes the (user_id, played_at DESC) index, which serves no query on its own anymore.
CREATE INDEX player_game_results_history_idx
  ON player_game_results (user_id, played_at, client_game_id);

DROP INDEX IF EXISTS player_game_results_recent_idx;
