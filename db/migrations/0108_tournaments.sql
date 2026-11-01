-- Tournaments: hosted competitions played at real game tables, with server-attested results,
-- standings, awards and trophies (see docs/accounts/tournaments.md). The aggregate is saved as a whole with
-- optimistic concurrency on tournaments.version; the other tables are its parts plus indexed
-- read models (lists, "my tournaments", trophy cabinet, achievement history).

CREATE TABLE tournaments (
  id                text        PRIMARY KEY CHECK (id ~ '^[a-z0-9]{10,16}$'),
  name              text        NOT NULL CHECK (char_length(name) BETWEEN 3 AND 48),
  description       text        NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  -- The tournament outlives its host's account (the field keeps its results); the name stays as a snapshot.
  host_user_id      text        REFERENCES auth_users (id) ON DELETE SET NULL,
  host_username     text,
  host_display_name text        NOT NULL,
  format            text        NOT NULL CHECK (format IN ('series', 'knockout')),
  -- TournamentSettings (maxEntrants, maxTableSize, rounds, advancePerTable, rulesetConfig, fillWithBots, botDifficulty).
  settings          jsonb       NOT NULL,
  max_entrants      smallint    NOT NULL CHECK (max_entrants BETWEEN 3 AND 64),
  visibility        text        NOT NULL CHECK (visibility IN ('public', 'private')),
  invite_code       text        CHECK (invite_code IS NULL OR invite_code ~ '^[a-z0-9]{8}$'),
  starts_at         timestamptz,
  status            text        NOT NULL CHECK (status IN ('registration', 'running', 'completed', 'cancelled')),
  current_round     smallint    NOT NULL DEFAULT 0 CHECK (current_round >= 0),
  -- Optimistic concurrency token: every save bumps it by one and requires the previous value.
  version           integer     NOT NULL CHECK (version > 0),
  created_at        timestamptz NOT NULL,
  started_at        timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility = 'public' OR invite_code IS NOT NULL),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);

-- Public lists, keyset paginated on (sort time DESC, id DESC) per status. Private tournaments are never listed.
CREATE INDEX tournaments_open_idx ON tournaments (created_at DESC, id DESC) WHERE status = 'registration' AND visibility = 'public';
CREATE INDEX tournaments_live_idx ON tournaments (started_at DESC, id DESC) WHERE status = 'running' AND visibility = 'public';
CREATE INDEX tournaments_finished_idx ON tournaments (completed_at DESC, id DESC) WHERE status = 'completed' AND visibility = 'public';
-- Hosting limits ("active hosted"), host's own list and account deletion.
CREATE INDEX tournaments_host_idx ON tournaments (host_user_id, status) WHERE host_user_id IS NOT NULL;
-- Scheduled starts (lazy auto-start today; ready for a sweeper if one is ever needed).
CREATE INDEX tournaments_scheduled_idx ON tournaments (starts_at) WHERE status = 'registration' AND starts_at IS NOT NULL;

-- Entrants with a snapshot of their names and level at registration. Deleting the account removes
-- the entry, its results and awards (GDPR erasure).
CREATE TABLE tournament_entrants (
  tournament_id        text        NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  user_id              text        NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  username             text,
  display_name         text        NOT NULL,
  level                integer     NOT NULL CHECK (level >= 0),
  seed                 smallint    NOT NULL CHECK (seed >= 1),
  status               text        NOT NULL CHECK (status IN ('registered', 'active', 'eliminated')),
  joined_at            timestamptz NOT NULL,
  -- EntrantFinal, frozen when the tournament completes (all null before).
  final_rank           smallint    CHECK (final_rank >= 1),
  final_points         integer,
  final_table_wins     smallint,
  final_matches_played smallint,
  final_rounds_played  smallint,
  final_total_score    integer,
  final_flawless       boolean,
  PRIMARY KEY (tournament_id, user_id)
);

-- "My tournaments" and the achievement history of a player.
CREATE INDEX tournament_entrants_user_idx ON tournament_entrants (user_id, joined_at DESC);
-- Champions strip and list rows (rank 1 of completed tournaments).
CREATE INDEX tournament_entrants_champion_idx ON tournament_entrants (tournament_id) WHERE final_rank = 1;

-- One table of one round. Seats hold account ids (null = bot) in deal order; an id whose account
-- was deleted stays as an opaque, unlinkable id (no name is stored with it).
CREATE TABLE tournament_matches (
  id            text        PRIMARY KEY,
  tournament_id text        NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  round         smallint    NOT NULL CHECK (round >= 1),
  table_number  smallint    NOT NULL CHECK (table_number >= 1),
  room_code     text        NOT NULL UNIQUE,
  seats         jsonb       NOT NULL,
  status        text        NOT NULL CHECK (status IN ('pending', 'completed', 'void')),
  created_at    timestamptz NOT NULL,
  deadline_at   timestamptz NOT NULL,
  -- Filled once the match is decided (played: reported by the worker, void: timed out / resolved).
  outcome       text        CHECK (outcome IN ('played', 'void')),
  game_id       text,
  completed_at  timestamptz,
  UNIQUE (tournament_id, round, table_number),
  CHECK ((status = 'pending') = (outcome IS NULL)),
  CHECK ((status = 'pending') = (completed_at IS NULL))
);

CREATE INDEX tournament_matches_tournament_idx ON tournament_matches (tournament_id, round, table_number);
CREATE INDEX tournament_matches_pending_idx ON tournament_matches (deadline_at) WHERE status = 'pending';

-- Per entrant result of a decided match. Idempotency is the match's status (a decided match is
-- never recorded again); the primary key guards against double rows.
CREATE TABLE tournament_match_results (
  match_id      text        NOT NULL REFERENCES tournament_matches (id) ON DELETE CASCADE,
  tournament_id text        NOT NULL,
  user_id       text        NOT NULL,
  placement     smallint    NOT NULL CHECK (placement BETWEEN 1 AND 6),
  score         integer     NOT NULL,
  points        smallint    NOT NULL CHECK (points >= 0),
  -- RoundResult[] ({ bid, tricksWon, roundScore }).
  rounds        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  no_show       boolean     NOT NULL DEFAULT false,
  bot_takeover  boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (match_id, user_id),
  -- Results exist for entrants only, and go with the entry (and so with the account).
  FOREIGN KEY (tournament_id, user_id) REFERENCES tournament_entrants (tournament_id, user_id) ON DELETE CASCADE
);

CREATE INDEX tournament_match_results_entrant_idx ON tournament_match_results (tournament_id, user_id);

-- Awards granted at completion; the trophy cabinet and award XP read from here.
CREATE TABLE tournament_awards (
  tournament_id text        NOT NULL,
  user_id       text        NOT NULL,
  award_id      text        NOT NULL CHECK (award_id ~ '^[a-z0-9-]{1,32}$'),
  tier          text        NOT NULL CHECK (tier IN ('gold', 'silver', 'bronze', 'special', 'participation')),
  xp            integer     NOT NULL CHECK (xp >= 0),
  awarded_at    timestamptz NOT NULL,
  PRIMARY KEY (tournament_id, user_id, award_id),
  FOREIGN KEY (tournament_id, user_id) REFERENCES tournament_entrants (tournament_id, user_id) ON DELETE CASCADE
);

CREATE INDEX tournament_awards_user_idx ON tournament_awards (user_id, awarded_at DESC);
