import 'server-only';

import type { RoundResult } from '@shared/domain/account';
import type {
  GameHistoryPageQuery,
  IGameResultRepository,
  NewGameResult,
  ScoredGameResult,
} from '@shared/application/ports/account';

import { getSql } from '../db/neon';

interface ResultRow {
  client_game_id: string;
  played_at: string | Date;
  player_count: number;
  placement: number;
  score: number;
  rounds: RoundResult[];
  xp: number;
  pinned_at: string | Date | null;
}

const toMillis = (value: string | Date) => new Date(value).getTime();

function toResult(row: ResultRow): ScoredGameResult {
  return {
    clientGameId: row.client_game_id,
    playedAt: toMillis(row.played_at),
    playerCount: row.player_count,
    placement: row.placement,
    score: row.score,
    rounds: row.rounds,
    xp: row.xp,
    pinnedAt: row.pinned_at === null ? null : toMillis(row.pinned_at),
  };
}

export class PostgresGameResultRepository implements IGameResultRepository {
  async insertMany(userId: string, results: readonly NewGameResult[]): Promise<string[]> {
    if (results.length === 0) return [];
    const sql = getSql();
    // One statement for the whole batch: unnest parallel arrays, skip ids that already exist.
    const rows = (await sql`
      INSERT INTO player_game_results (user_id, client_game_id, played_at, player_count, placement, score, rounds, xp)
      SELECT ${userId}, r.client_game_id, to_timestamp(r.played_at / 1000.0), r.player_count, r.placement, r.score, r.rounds, r.xp
      FROM unnest(
        ${results.map((r) => r.clientGameId)}::text[],
        ${results.map((r) => r.playedAt)}::bigint[],
        ${results.map((r) => r.playerCount)}::smallint[],
        ${results.map((r) => r.placement)}::smallint[],
        ${results.map((r) => r.score)}::integer[],
        ${results.map((r) => JSON.stringify(r.rounds))}::jsonb[],
        ${results.map((r) => r.xp)}::integer[]
      ) AS r(client_game_id, played_at, player_count, placement, score, rounds, xp)
      ON CONFLICT (user_id, client_game_id) DO NOTHING
      RETURNING client_game_id
    `) as { client_game_id: string }[];
    return rows.map((row) => row.client_game_id);
  }

  async listAll(userId: string): Promise<ScoredGameResult[]> {
    const rows = (await getSql()`
      SELECT client_game_id, played_at, player_count, placement, score, rounds, xp, pinned_at
      FROM player_game_results WHERE user_id = ${userId}
      ORDER BY played_at, client_game_id
    `) as ResultRow[];
    return rows.map(toResult);
  }

  async listRecent(userId: string, limit: number): Promise<ScoredGameResult[]> {
    const rows = (await getSql()`
      SELECT client_game_id, played_at, player_count, placement, score, rounds, xp, pinned_at
      FROM player_game_results WHERE user_id = ${userId}
      ORDER BY played_at DESC, client_game_id DESC LIMIT ${limit}
    `) as ResultRow[];
    return rows.map(toResult);
  }

  async listPage(userId: string, { before, limit }: GameHistoryPageQuery): Promise<ScoredGameResult[]> {
    const sql = getSql();
    // Row comparison keeps the scan on player_game_results_history_idx. The cursor timestamp is
    // rebuilt with the same to_timestamp(ms / 1000.0) used on insert, so equality is exact.
    const rows = (before
      ? await sql`
          SELECT client_game_id, played_at, player_count, placement, score, rounds, xp, pinned_at
          FROM player_game_results
          WHERE user_id = ${userId}
            AND (played_at, client_game_id) < (to_timestamp(${before.playedAt}::bigint / 1000.0), ${before.clientGameId})
          ORDER BY played_at DESC, client_game_id DESC LIMIT ${limit}
        `
      : await sql`
          SELECT client_game_id, played_at, player_count, placement, score, rounds, xp, pinned_at
          FROM player_game_results WHERE user_id = ${userId}
          ORDER BY played_at DESC, client_game_id DESC LIMIT ${limit}
        `) as ResultRow[];
    return rows.map(toResult);
  }

  async listPinned(userId: string): Promise<ScoredGameResult[]> {
    const rows = (await getSql()`
      SELECT client_game_id, played_at, player_count, placement, score, rounds, xp, pinned_at
      FROM player_game_results WHERE user_id = ${userId} AND pinned_at IS NOT NULL
      ORDER BY pinned_at DESC, client_game_id
    `) as ResultRow[];
    return rows.map(toResult);
  }

  async countPinned(userId: string): Promise<number> {
    const rows = (await getSql()`
      SELECT count(*)::int AS count FROM player_game_results WHERE user_id = ${userId} AND pinned_at IS NOT NULL
    `) as { count: number }[];
    return rows[0]?.count ?? 0;
  }

  async setPinned(userId: string, clientGameId: string, pinnedAt: number | null): Promise<boolean> {
    const at = pinnedAt === null ? null : new Date(pinnedAt).toISOString();
    const rows = (await getSql()`
      UPDATE player_game_results SET pinned_at = ${at}::timestamptz
      WHERE user_id = ${userId} AND client_game_id = ${clientGameId}
      RETURNING client_game_id
    `) as { client_game_id: string }[];
    return rows.length > 0;
  }
}
