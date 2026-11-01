import 'server-only';

import type { Tournament, TournamentStatus } from '@shared/domain/tournament';
import type {
  ChampionRow,
  ITournamentRepository,
  SaveTournamentResult,
  TournamentListQuery,
  TournamentListStatus,
  TournamentSummary,
  UserTournamentRow,
} from '@shared/application/ports/tournament';

import { getSql } from '../db/neon';
import { toPostgresJson } from '../telemetry/postgres-json';
import {
  toChampionRow,
  toSummary,
  toTournament,
  toUserTournamentRow,
  type AwardRow,
  type ChampionDbRow,
  type EntrantRow,
  type MatchResultRow,
  type MatchRow,
  type SummaryRow,
  type TournamentRow,
  type UserTournamentDbRow,
} from './tournament-rows';
import { toSavePayload } from './tournament-save-payload';

/*
 * The tournament aggregate in Postgres (db/migrations/0108_tournaments.sql). A load is one
 * read-only snapshot transaction; a save is one transaction whose first statement checks the
 * version (optimistic concurrency) and aborts everything when another writer won. Both are a single
 * HTTP round trip on Neon's driver.
 */

/** Postgres SQLSTATE of division_by_zero: how the version check fails the save transaction. */
const VERSION_CONFLICT_SQLSTATE = '22012';

/** True when the save transaction was aborted by the version check (another writer won). */
function isVersionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === VERSION_CONFLICT_SQLSTATE;
}

// ---------------------------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------------------------

const TOURNAMENT_COLUMNS = `
  t.id, t.name, t.description, t.host_user_id, t.host_username, t.host_display_name, t.format, t.settings,
  t.visibility, t.invite_code, t.starts_at, t.status, t.current_round, t.version, t.created_at, t.started_at,
  t.completed_at, t.cancelled_at`;

const SELECT_TOURNAMENT = `SELECT ${TOURNAMENT_COLUMNS} FROM tournaments t WHERE t.id = $1`;

const SELECT_ENTRANTS = `
  SELECT user_id, username, display_name, level, seed, status, joined_at, final_rank, final_points, final_table_wins,
    final_matches_played, final_rounds_played, final_total_score, final_flawless
  FROM tournament_entrants WHERE tournament_id = $1
  ORDER BY seed, joined_at, user_id`;

const SELECT_MATCHES = `
  SELECT id, round, table_number, room_code, seats, status, created_at, deadline_at, outcome, game_id, completed_at,
    last_activity_at, live_round, live_max_rounds
  FROM tournament_matches WHERE tournament_id = $1
  ORDER BY round, table_number`;

const SELECT_RESULTS = `
  SELECT match_id, user_id, placement, score, points, rounds, no_show, bot_takeover
  FROM tournament_match_results WHERE tournament_id = $1`;

const SELECT_AWARDS = `SELECT user_id, award_id, tier, xp, awarded_at FROM tournament_awards WHERE tournament_id = $1`;

// ---------------------------------------------------------------------------------------------
// Save: every statement reads the aggregate from the one jsonb parameter $1
// ---------------------------------------------------------------------------------------------

const TOURNAMENT_ID = `($1::jsonb #>> '{tournament,id}')`;

/** Fails the transaction (division by zero) unless exactly the expected version was replaced. */
const UPDATE_TOURNAMENT = `
  WITH d AS (SELECT $1::jsonb -> 'tournament' AS t),
  updated AS (
    UPDATE tournaments SET
      name = d.t->>'name',
      description = d.t->>'description',
      format = d.t->>'format',
      settings = d.t->'settings',
      max_entrants = (d.t->>'maxEntrants')::smallint,
      visibility = d.t->>'visibility',
      invite_code = d.t->>'inviteCode',
      starts_at = (d.t->>'startsAt')::timestamptz,
      status = d.t->>'status',
      current_round = (d.t->>'currentRound')::smallint,
      version = (d.t->>'version')::int,
      started_at = (d.t->>'startedAt')::timestamptz,
      completed_at = (d.t->>'completedAt')::timestamptz,
      cancelled_at = (d.t->>'cancelledAt')::timestamptz,
      updated_at = now()
    FROM d
    WHERE tournaments.id = d.t->>'id' AND tournaments.version = $2::int
    RETURNING 1
  )
  SELECT 1 / (SELECT count(*)::int FROM updated) AS saved`;

/** Same guard for a new tournament: an existing id (collision) is a conflict. */
const INSERT_TOURNAMENT = `
  WITH d AS (SELECT $1::jsonb -> 'tournament' AS t),
  inserted AS (
    INSERT INTO tournaments (
      id, name, description, host_user_id, host_username, host_display_name, format, settings, max_entrants,
      visibility, invite_code, starts_at, status, current_round, version, created_at, started_at, completed_at, cancelled_at
    )
    SELECT
      d.t->>'id', d.t->>'name', d.t->>'description', d.t->>'hostUserId', d.t->>'hostUsername', d.t->>'hostDisplayName',
      d.t->>'format', d.t->'settings', (d.t->>'maxEntrants')::smallint, d.t->>'visibility', d.t->>'inviteCode',
      (d.t->>'startsAt')::timestamptz, d.t->>'status', (d.t->>'currentRound')::smallint, (d.t->>'version')::int,
      (d.t->>'createdAt')::timestamptz, (d.t->>'startedAt')::timestamptz, (d.t->>'completedAt')::timestamptz,
      (d.t->>'cancelledAt')::timestamptz
    FROM d
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT 1 / (SELECT count(*)::int FROM inserted) AS saved`;

/** Withdrawn entrants (registration only) are the stored ones missing from the aggregate. */
const DELETE_WITHDRAWN_ENTRANTS = `
  DELETE FROM tournament_entrants te
  WHERE te.tournament_id = ${TOURNAMENT_ID}
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements($1::jsonb -> 'entrants') e WHERE e->>'userId' = te.user_id)`;

/**
 * An account deleted after the load took its entry with it (cascade): it is never re-inserted.
 * Unchanged rows are not rewritten.
 */
const UPSERT_ENTRANTS = `
  INSERT INTO tournament_entrants (
    tournament_id, user_id, username, display_name, level, seed, status, joined_at, final_rank, final_points,
    final_table_wins, final_matches_played, final_rounds_played, final_total_score, final_flawless
  )
  SELECT
    ${TOURNAMENT_ID}, e->>'userId', e->>'username', e->>'displayName', (e->>'level')::int, (e->>'seed')::smallint,
    e->>'status', (e->>'joinedAt')::timestamptz, (e->'final'->>'rank')::smallint, (e->'final'->>'points')::int,
    (e->'final'->>'tableWins')::smallint, (e->'final'->>'matchesPlayed')::smallint, (e->'final'->>'roundsPlayed')::smallint,
    (e->'final'->>'totalScore')::int, (e->'final'->>'flawless')::boolean
  FROM jsonb_array_elements($1::jsonb -> 'entrants') e
  WHERE EXISTS (SELECT 1 FROM auth_users u WHERE u.id = e->>'userId')
  ON CONFLICT (tournament_id, user_id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, level = EXCLUDED.level, seed = EXCLUDED.seed,
    status = EXCLUDED.status, final_rank = EXCLUDED.final_rank, final_points = EXCLUDED.final_points,
    final_table_wins = EXCLUDED.final_table_wins, final_matches_played = EXCLUDED.final_matches_played,
    final_rounds_played = EXCLUDED.final_rounds_played, final_total_score = EXCLUDED.final_total_score,
    final_flawless = EXCLUDED.final_flawless
  WHERE (
    tournament_entrants.username, tournament_entrants.display_name, tournament_entrants.level, tournament_entrants.seed,
    tournament_entrants.status, tournament_entrants.final_rank, tournament_entrants.final_points,
    tournament_entrants.final_table_wins, tournament_entrants.final_matches_played, tournament_entrants.final_rounds_played,
    tournament_entrants.final_total_score, tournament_entrants.final_flawless
  ) IS DISTINCT FROM (
    EXCLUDED.username, EXCLUDED.display_name, EXCLUDED.level, EXCLUDED.seed, EXCLUDED.status, EXCLUDED.final_rank,
    EXCLUDED.final_points, EXCLUDED.final_table_wins, EXCLUDED.final_matches_played, EXCLUDED.final_rounds_played,
    EXCLUDED.final_total_score, EXCLUDED.final_flawless
  )`;

/** New tables, decided ones and live progress (seats and ids never change). */
const UPSERT_MATCHES = `
  INSERT INTO tournament_matches (
    id, tournament_id, round, table_number, room_code, seats, status, created_at, deadline_at, outcome, game_id, completed_at,
    last_activity_at, live_round, live_max_rounds
  )
  SELECT
    m->>'id', ${TOURNAMENT_ID}, (m->>'round')::smallint, (m->>'table')::smallint, m->>'roomCode', m->'seats', m->>'status',
    (m->>'createdAt')::timestamptz, (m->>'deadlineAt')::timestamptz, m->>'outcome', m->>'gameId', (m->>'completedAt')::timestamptz,
    (m->'live'->>'lastActivityAt')::timestamptz, (m->'live'->>'round')::int, (m->'live'->>'maxRounds')::int
  FROM jsonb_array_elements($1::jsonb -> 'matches') m
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, deadline_at = EXCLUDED.deadline_at, outcome = EXCLUDED.outcome,
    game_id = EXCLUDED.game_id, completed_at = EXCLUDED.completed_at, last_activity_at = EXCLUDED.last_activity_at,
    live_round = EXCLUDED.live_round, live_max_rounds = EXCLUDED.live_max_rounds`;

/** Results and awards are written once and exist for current entrants only (foreign key). */
const INSERT_RESULTS = `
  INSERT INTO tournament_match_results (match_id, tournament_id, user_id, placement, score, points, rounds, no_show, bot_takeover)
  SELECT
    r->>'matchId', ${TOURNAMENT_ID}, r->>'userId', (r->>'placement')::smallint, (r->>'score')::int, (r->>'points')::smallint,
    COALESCE(r->'rounds', '[]'::jsonb), (r->>'noShow')::boolean, (r->>'botTakeover')::boolean
  FROM jsonb_array_elements($1::jsonb -> 'results') r
  WHERE EXISTS (SELECT 1 FROM tournament_entrants te WHERE te.tournament_id = ${TOURNAMENT_ID} AND te.user_id = r->>'userId')
  ON CONFLICT (match_id, user_id) DO NOTHING`;

const INSERT_AWARDS = `
  INSERT INTO tournament_awards (tournament_id, user_id, award_id, tier, xp, awarded_at)
  SELECT ${TOURNAMENT_ID}, a->>'userId', a->>'awardId', a->>'tier', (a->>'xp')::int, (a->>'awardedAt')::timestamptz
  FROM jsonb_array_elements($1::jsonb -> 'awards') a
  WHERE EXISTS (SELECT 1 FROM tournament_entrants te WHERE te.tournament_id = ${TOURNAMENT_ID} AND te.user_id = a->>'userId')
  ON CONFLICT (tournament_id, user_id, award_id) DO NOTHING`;

// ---------------------------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------------------------

const SUMMARY_COLUMNS = `${TOURNAMENT_COLUMNS},
  (SELECT count(*)::int FROM tournament_entrants e WHERE e.tournament_id = t.id) AS entrant_count,
  c.user_id AS champion_user_id, c.username AS champion_username, c.display_name AS champion_display_name`;

const CHAMPION_JOIN = `
  LEFT JOIN LATERAL (
    SELECT user_id, username, display_name FROM tournament_entrants
    WHERE tournament_id = t.id AND final_rank = 1
    ORDER BY user_id LIMIT 1
  ) c ON t.status = 'completed'`;

/**
 * Each public list has its own partial index on (sort column DESC, id DESC). Status and column are
 * inlined from this constant (never from input), so the planner can match the partial index.
 */
const LIST_ORDER: Record<TournamentListStatus, { status: TournamentStatus; column: 'created_at' | 'started_at' | 'completed_at' }> = {
  open: { status: 'registration', column: 'created_at' },
  live: { status: 'running', column: 'started_at' },
  finished: { status: 'completed', column: 'completed_at' },
};

function listStatement(status: TournamentListStatus, withCursor: boolean): string {
  const { status: stored, column } = LIST_ORDER[status];
  return `
    SELECT ${SUMMARY_COLUMNS}
    FROM tournaments t
    ${CHAMPION_JOIN}
    WHERE t.status = '${stored}' AND t.visibility = 'public'
      ${withCursor ? `AND (t.${column}, t.id) < ($2::timestamptz, $3)` : ''}
    ORDER BY t.${column} DESC, t.id DESC
    LIMIT $1`;
}

const LIST_FOR_USER = `
  SELECT ${SUMMARY_COLUMNS},
    COALESCE(t.host_user_id = $1, false) AS is_host,
    me.status AS entry_status, me.seed AS entry_seed, me.final_rank AS entry_final_rank
  FROM tournaments t
  ${CHAMPION_JOIN}
  LEFT JOIN tournament_entrants me ON me.tournament_id = t.id AND me.user_id = $1
  WHERE t.id IN (
    SELECT id FROM tournaments WHERE host_user_id = $1
    UNION
    SELECT tournament_id FROM tournament_entrants WHERE user_id = $1
  )
  ORDER BY t.created_at DESC, t.id DESC
  LIMIT $2`;

const RECENT_CHAMPIONS = `
  SELECT
    t.id AS tournament_id, t.name AS tournament_name, t.format, t.completed_at,
    (SELECT count(*)::int FROM tournament_entrants e WHERE e.tournament_id = t.id) AS entrants,
    c.user_id, c.username, c.display_name
  FROM tournaments t
  JOIN LATERAL (
    SELECT user_id, username, display_name FROM tournament_entrants
    WHERE tournament_id = t.id AND final_rank = 1
    ORDER BY user_id LIMIT 1
  ) c ON true
  WHERE t.status = 'completed' AND t.visibility = 'public'
  ORDER BY t.completed_at DESC, t.id DESC
  LIMIT $1`;

export class PostgresTournamentRepository implements ITournamentRepository {
  /**
   * Matches and awards exactly as they were loaded. The aggregate is immutable, so an object found
   * here again at save time is unchanged and needs no write (see SavePayloadOptions.isPersisted).
   */
  private readonly persisted = new WeakSet<object>();

  async get(id: string): Promise<Tournament | null> {
    const sql = getSql();
    const [tournaments, entrants, matches, results, awards] = (await sql.transaction(
      [
        sql.query(SELECT_TOURNAMENT, [id]),
        sql.query(SELECT_ENTRANTS, [id]),
        sql.query(SELECT_MATCHES, [id]),
        sql.query(SELECT_RESULTS, [id]),
        sql.query(SELECT_AWARDS, [id]),
      ],
      { readOnly: true, isolationLevel: 'RepeatableRead' }
    )) as [TournamentRow[], EntrantRow[], MatchRow[], MatchResultRow[], AwardRow[]];
    if (!tournaments[0]) return null;
    const tournament = toTournament({ tournament: tournaments[0], entrants, matches, results, awards });
    for (const match of tournament.matches) this.persisted.add(match);
    for (const award of tournament.awards) this.persisted.add(award);
    return tournament;
  }

  async save(tournament: Tournament, expectedVersion: number): Promise<SaveTournamentResult> {
    const payload = toSavePayload(tournament, { isPersisted: (part) => this.persisted.has(part) });
    const json = toPostgresJson(payload);
    const sql = getSql();
    const statements = [
      expectedVersion === 0 ? sql.query(INSERT_TOURNAMENT, [json]) : sql.query(UPDATE_TOURNAMENT, [json, expectedVersion]),
      sql.query(DELETE_WITHDRAWN_ENTRANTS, [json]),
      sql.query(UPSERT_ENTRANTS, [json]),
    ];
    if (payload.matches.length > 0) statements.push(sql.query(UPSERT_MATCHES, [json]));
    if (payload.results.length > 0) statements.push(sql.query(INSERT_RESULTS, [json]));
    if (payload.awards.length > 0) statements.push(sql.query(INSERT_AWARDS, [json]));
    try {
      await sql.transaction(statements);
    } catch (error) {
      if (isVersionConflict(error)) return 'conflict';
      throw error;
    }
    for (const match of tournament.matches) this.persisted.add(match);
    for (const award of tournament.awards) this.persisted.add(award);
    return 'saved';
  }

  async list({ status, after, limit }: TournamentListQuery): Promise<TournamentSummary[]> {
    const sql = getSql();
    const rows = (await (after
      ? sql.query(listStatement(status, true), [limit, new Date(after.sortAt).toISOString(), after.id])
      : sql.query(listStatement(status, false), [limit]))) as SummaryRow[];
    return rows.map(toSummary);
  }

  async listForUser(userId: string, limit: number): Promise<UserTournamentRow[]> {
    const rows = (await getSql().query(LIST_FOR_USER, [userId, limit])) as UserTournamentDbRow[];
    return rows.map(toUserTournamentRow);
  }

  async countActiveHosted(userId: string): Promise<number> {
    const [row] = (await getSql()`
      SELECT count(*)::int AS count FROM tournaments
      WHERE host_user_id = ${userId} AND status IN ('registration', 'running')
    `) as { count: number }[];
    return row?.count ?? 0;
  }

  async recentChampions(limit: number): Promise<ChampionRow[]> {
    const rows = (await getSql().query(RECENT_CHAMPIONS, [limit])) as ChampionDbRow[];
    return rows.map(toChampionRow);
  }

  async listOpenHostedIds(userId: string): Promise<string[]> {
    const rows = (await getSql()`
      SELECT id FROM tournaments WHERE host_user_id = ${userId} AND status = 'registration' ORDER BY created_at
    `) as { id: string }[];
    return rows.map((row) => row.id);
  }

  async listActiveHostedIds(userId: string): Promise<string[]> {
    const rows = (await getSql()`
      SELECT id FROM tournaments WHERE host_user_id = ${userId} AND status IN ('registration', 'running') ORDER BY created_at
    `) as { id: string }[];
    return rows.map((row) => row.id);
  }

  /** Host columns are never written by a save, so this cannot race with the aggregate's version. */
  async forgetHost(userId: string, displayName: string): Promise<void> {
    await getSql()`
      UPDATE tournaments SET host_username = NULL, host_display_name = ${displayName}, updated_at = now()
      WHERE host_user_id = ${userId}
    `;
  }
}
