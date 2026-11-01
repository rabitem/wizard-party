import 'server-only';

import type { RoundResult } from '@shared/domain/account/game-result';
import type { EntrantStatus, MatchStatus, TournamentFormatId, TournamentParticipation, TrophyTier } from '@shared/domain/tournament';
import type { EntryRecord, ITournamentHistoryReader, MatchResultRecord, TrophyRecord } from '@shared/application/ports/tournament';

import { getSql } from '../db/neon';

export interface ParticipationRow {
  id: string;
  name: string;
  format: TournamentFormatId;
  completed_at: string | Date;
  current_round: number;
  entrants: number;
  was_host: boolean;
  was_entrant: boolean;
  final_rank: number | null;
  final_matches_played: number | null;
  final_table_wins: number | null;
  final_rounds_played: number | null;
  final_flawless: boolean | null;
  awards: { awardId: string; tier: TrophyTier; xp: number }[] | null;
}

export interface TrophyRow {
  tournament_id: string;
  tournament_name: string;
  format: TournamentFormatId;
  award_id: string;
  tier: TrophyTier;
  xp: number;
  awarded_at: string | Date;
  entrants: number;
  final_rank: number | null;
}

export interface EntryRow {
  tournament_id: string;
  username: string | null;
  display_name: string;
  level: number;
  seed: number;
  status: EntrantStatus;
  joined_at: string | Date;
}

export interface MatchResultExportRow {
  tournament_id: string;
  match_id: string;
  round: number;
  table_number: number;
  match_status: MatchStatus;
  completed_at: string | Date | null;
  placement: number;
  score: number;
  points: number;
  rounds: RoundResult[] | null;
  no_show: boolean;
  bot_takeover: boolean;
}

const toMillis = (value: string | Date) => new Date(value).getTime();

export function toEntryRecord(row: EntryRow): EntryRecord {
  return {
    tournamentId: row.tournament_id,
    username: row.username,
    displayName: row.display_name,
    level: Number(row.level),
    seed: Number(row.seed),
    status: row.status,
    joinedAt: toMillis(row.joined_at),
  };
}

export function toMatchResultRecord(row: MatchResultExportRow): MatchResultRecord {
  return {
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    round: Number(row.round),
    table: Number(row.table_number),
    matchStatus: row.match_status,
    completedAt: row.completed_at === null ? null : toMillis(row.completed_at),
    placement: Number(row.placement),
    score: Number(row.score),
    points: Number(row.points),
    rounds: row.rounds ?? [],
    noShow: row.no_show,
    botTakeover: row.bot_takeover,
  };
}

export function toParticipation(row: ParticipationRow): TournamentParticipation {
  return {
    tournamentId: row.id,
    name: row.name,
    format: row.format,
    finishedAt: toMillis(row.completed_at),
    entrants: Number(row.entrants),
    wasHost: row.was_host,
    wasEntrant: row.was_entrant,
    finalRank: row.final_rank,
    matchesPlayed: row.final_matches_played ?? 0,
    tableWins: row.final_table_wins ?? 0,
    roundsPlayed: row.final_rounds_played ?? 0,
    totalRounds: row.current_round,
    flawless: row.final_flawless ?? false,
    awards: (row.awards ?? []).map(({ awardId, tier, xp }) => ({ awardId, tier, xp: Number(xp) })),
  };
}

export function toTrophy(row: TrophyRow): TrophyRecord {
  return {
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name,
    format: row.format,
    awardId: row.award_id,
    tier: row.tier,
    xp: Number(row.xp),
    awardedAt: toMillis(row.awarded_at),
    entrants: Number(row.entrants),
    finalRank: row.final_rank,
  };
}

/**
 * Account-facing read model of tournaments: participations feed achievements and award XP (read on
 * every progress computation, so it is one indexed query), trophies feed the cabinet. Reads the
 * frozen `final_*` columns of tournament_entrants and tournament_awards (0108 migration); only
 * completed tournaments count.
 */
export class PostgresTournamentHistoryReader implements ITournamentHistoryReader {
  async participations(userId: string): Promise<TournamentParticipation[]> {
    // `mine` unions the two index-backed paths (entries by user, tournaments by host) instead of
    // an OR across a join, which Postgres could only answer with a scan.
    const rows = (await getSql()`
      WITH mine AS (
        SELECT tournament_id AS id FROM tournament_entrants WHERE user_id = ${userId}
        UNION
        SELECT id FROM tournaments WHERE host_user_id = ${userId}
      )
      SELECT
        t.id, t.name, t.format, t.completed_at, t.current_round,
        (SELECT count(*)::int FROM tournament_entrants c WHERE c.tournament_id = t.id) AS entrants,
        (t.host_user_id IS NOT DISTINCT FROM ${userId}::text) AS was_host,
        (e.user_id IS NOT NULL) AS was_entrant,
        e.final_rank, e.final_matches_played, e.final_table_wins, e.final_rounds_played, e.final_flawless,
        (
          SELECT json_agg(json_build_object('awardId', a.award_id, 'tier', a.tier, 'xp', a.xp) ORDER BY a.award_id)
          FROM tournament_awards a WHERE a.tournament_id = t.id AND a.user_id = ${userId}
        ) AS awards
      FROM mine
      JOIN tournaments t ON t.id = mine.id
      LEFT JOIN tournament_entrants e ON e.tournament_id = t.id AND e.user_id = ${userId}
      WHERE t.status = 'completed'
      ORDER BY t.completed_at, t.id
    `) as ParticipationRow[];
    return rows.map(toParticipation);
  }

  async trophies(userId: string, limit: number): Promise<TrophyRecord[]> {
    const rows = (await getSql()`
      SELECT
        a.tournament_id, t.name AS tournament_name, t.format, a.award_id, a.tier, a.xp, a.awarded_at,
        (SELECT count(*)::int FROM tournament_entrants c WHERE c.tournament_id = a.tournament_id) AS entrants,
        e.final_rank
      FROM tournament_awards a
      JOIN tournaments t ON t.id = a.tournament_id
      LEFT JOIN tournament_entrants e ON e.tournament_id = a.tournament_id AND e.user_id = a.user_id
      WHERE a.user_id = ${userId}
      ORDER BY a.awarded_at DESC, a.tournament_id DESC, a.award_id
      LIMIT ${limit}
    `) as TrophyRow[];
    return rows.map(toTrophy);
  }

  async entries(userId: string, limit: number): Promise<EntryRecord[]> {
    const rows = (await getSql()`
      SELECT tournament_id, username, display_name, level, seed, status, joined_at
      FROM tournament_entrants
      WHERE user_id = ${userId}
      ORDER BY joined_at DESC, tournament_id DESC
      LIMIT ${limit}
    `) as EntryRow[];
    return rows.map(toEntryRecord);
  }

  async matchResults(userId: string, limit: number): Promise<MatchResultRecord[]> {
    // From the user's entries (indexed by user), then their results per entry (indexed by entry).
    const rows = (await getSql()`
      SELECT
        r.tournament_id, r.match_id, m.round, m.table_number, m.status AS match_status, m.completed_at,
        r.placement, r.score, r.points, r.rounds, r.no_show, r.bot_takeover
      FROM tournament_entrants e
      JOIN tournament_match_results r ON r.tournament_id = e.tournament_id AND r.user_id = e.user_id
      JOIN tournament_matches m ON m.id = r.match_id
      WHERE e.user_id = ${userId}
      ORDER BY m.completed_at DESC NULLS LAST, r.match_id DESC
      LIMIT ${limit}
    `) as MatchResultExportRow[];
    return rows.map(toMatchResultRecord);
  }
}
