-- Live progress of pending tournament tables (see docs/accounts/tournaments.md, MatchLiveState): the game
-- worker pings when a match game starts and at every round end. A table with recent activity is
-- being played, so the host may not resolve (void) it. Additive and nullable: a table nobody
-- reported yet (or reported by a worker from before the pings) has no live state. Rounds are
-- bounded like the wire format (TOURNAMENT_WIRE_LIMITS.MAX_ROUNDS = 20).

ALTER TABLE tournament_matches
  ADD COLUMN last_activity_at timestamptz,
  ADD COLUMN live_round       integer CHECK (live_round BETWEEN 1 AND 20),
  ADD COLUMN live_max_rounds  integer CHECK (live_max_rounds BETWEEN 1 AND 20);

-- All three or none, and the round in play never beyond the last one.
ALTER TABLE tournament_matches
  ADD CONSTRAINT tournament_matches_live_state_check CHECK (
    (last_activity_at IS NULL AND live_round IS NULL AND live_max_rounds IS NULL)
    OR (last_activity_at IS NOT NULL AND live_round IS NOT NULL AND live_max_rounds IS NOT NULL AND live_round <= live_max_rounds)
  );
