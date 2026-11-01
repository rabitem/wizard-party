import 'server-only';

import { DEFAULT_PROFILE_VISIBILITY, type PlayerStatsSummary, type RoundResult } from '@shared/domain/account';
import {
  PUBLIC_PROFILE_LIMITS,
  type PublicProfileGameSource,
  type PublicProfileSource,
  type PublicProfileTrophySource,
} from '@shared/domain/account/public-profile';
import { TROPHY_TIERS, type TournamentVisibility, type TrophyTier } from '@shared/domain/tournament';
import type { IPublicProfileReader } from '@shared/application/ports/account/public-profile.port';

import { getSql } from '../db/neon';

interface GameJson {
  played_at: string;
  player_count: number;
  placement: number;
  score: number;
  rounds: RoundResult[] | null;
  xp: number;
  pinned_at: string | null;
}

interface TrophyJson {
  tournament_id: string;
  tournament_name: string;
  visibility: TournamentVisibility;
  award_id: string;
  tier: TrophyTier;
  final_rank: number | null;
  entrants: number;
  awarded_at: string;
}

interface PublicProfileRow {
  username: string;
  display_username: string;
  member_since: string | Date;
  tagline: string | null;
  is_public: boolean;
  show_history: boolean;
  summary: Partial<PlayerStatsSummary> | null;
  total_xp: number;
  avatar: string | null;
  appearance: unknown;
  achievements: { id: string; unlocked_at: string }[] | null;
  pinned_games: GameJson[] | null;
  recent_games: GameJson[] | null;
  trophies: TrophyJson[] | null;
  trophy_counts: Record<string, number> | null;
}

const toTime = (value: string | Date | null): number | null => (value === null ? null : new Date(value).getTime());

function toGame(row: GameJson): PublicProfileGameSource {
  return {
    playedAt: toTime(row.played_at) ?? 0,
    playerCount: row.player_count,
    placement: row.placement,
    score: row.score,
    rounds: Array.isArray(row.rounds) ? row.rounds : [],
    xp: row.xp,
    pinnedAt: toTime(row.pinned_at),
  };
}

function toTrophy(row: TrophyJson): PublicProfileTrophySource {
  return {
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name,
    visibility: row.visibility,
    awardId: row.award_id,
    tier: row.tier,
    finalRank: row.final_rank,
    entrants: Number(row.entrants) || 0,
    awardedAt: toTime(row.awarded_at) ?? 0,
  };
}

function toTrophyCounts(row: Record<string, number> | null): Partial<Record<TrophyTier, number>> {
  return Object.fromEntries(TROPHY_TIERS.map((tier) => [tier, Number(row?.[tier]) || 0]));
}

/**
 * Loads one public profile in a single round trip. Detail rows (achievements, games, trophies) are
 * only aggregated when the profile is public, and recent games only when the player shares them.
 */
export class PostgresPublicProfileReader implements IPublicProfileReader {
  async findByUsername(username: string): Promise<PublicProfileSource | null> {
    const rows = (await getSql()`
      WITH target AS (
        SELECT
          u.id,
          u."username" AS username,
          u."displayUsername" AS display_username,
          u."createdAt" AS member_since,
          p.tagline,
          COALESCE(p.is_public, ${DEFAULT_PROFILE_VISIBILITY.isPublic}::boolean) AS is_public,
          COALESCE(p.show_history, ${DEFAULT_PROFILE_VISIBILITY.showHistory}::boolean) AS show_history,
          pr.summary,
          COALESCE(pr.total_xp, 0) AS total_xp,
          d.data ->> 'avatar' AS avatar,
          p.appearance
        FROM auth_users u
        LEFT JOIN player_profiles p ON p.user_id = u.id
        LEFT JOIN player_progress pr ON pr.user_id = u.id
        LEFT JOIN account_documents d ON d.user_id = u.id AND d.doc_key = 'game-settings'
        -- Handles are stored normalized (lowercase) by the username plugin: unique index lookup.
        WHERE u."username" = ${username}
        LIMIT 1
      )
      SELECT
        t.username, t.display_username, t.member_since, t.tagline,
        t.is_public, t.show_history, t.summary, t.total_xp, t.avatar, t.appearance,
        CASE WHEN t.is_public THEN (
          SELECT json_agg(json_build_object('id', a.achievement_id, 'unlocked_at', a.unlocked_at))
          FROM player_achievements a WHERE a.user_id = t.id
        ) END AS achievements,
        CASE WHEN t.is_public THEN (
          SELECT json_agg(g ORDER BY g.pinned_at DESC)
          FROM (
            SELECT r.played_at, r.player_count, r.placement, r.score, r.rounds, r.xp, r.pinned_at
            FROM player_game_results r
            WHERE r.user_id = t.id AND r.pinned_at IS NOT NULL
            ORDER BY r.pinned_at DESC
            LIMIT ${PUBLIC_PROFILE_LIMITS.PINNED_GAMES}
          ) g
        ) END AS pinned_games,
        CASE WHEN t.is_public AND t.show_history THEN (
          SELECT json_agg(g ORDER BY g.played_at DESC)
          FROM (
            SELECT r.played_at, r.player_count, r.placement, r.score, r.rounds, r.xp, r.pinned_at
            FROM player_game_results r
            WHERE r.user_id = t.id
            ORDER BY r.played_at DESC
            LIMIT ${PUBLIC_PROFILE_LIMITS.RECENT_GAMES}
          ) g
        ) END AS recent_games,
        CASE WHEN t.is_public THEN (
          SELECT json_agg(tr ORDER BY tr.awarded_at DESC)
          FROM (
            SELECT
              a.tournament_id, tm.name AS tournament_name, tm.visibility, a.award_id, a.tier, a.awarded_at,
              e.final_rank,
              (SELECT count(*) FROM tournament_entrants f WHERE f.tournament_id = a.tournament_id) AS entrants
            FROM tournament_awards a
            JOIN tournaments tm ON tm.id = a.tournament_id
            JOIN tournament_entrants e ON e.tournament_id = a.tournament_id AND e.user_id = a.user_id
            WHERE a.user_id = t.id
            ORDER BY a.awarded_at DESC
            LIMIT ${PUBLIC_PROFILE_LIMITS.TROPHIES}
          ) tr
        ) END AS trophies,
        CASE WHEN t.is_public THEN (
          SELECT json_object_agg(c.tier, c.count)
          FROM (SELECT a.tier, count(*) AS count FROM tournament_awards a WHERE a.user_id = t.id GROUP BY a.tier) c
        ) END AS trophy_counts
      FROM target t
    `) as PublicProfileRow[];

    const row = rows[0];
    if (!row?.username) return null;
    return {
      username: row.username,
      displayUsername: row.display_username,
      tagline: row.tagline ?? '',
      avatar: row.avatar,
      appearance: row.appearance,
      isPublic: row.is_public,
      showHistory: row.show_history,
      memberSince: toTime(row.member_since) ?? 0,
      totalXp: Number(row.total_xp) || 0,
      stats: row.summary,
      achievements: (row.achievements ?? []).map((a) => ({ id: a.id, unlockedAt: toTime(a.unlocked_at) ?? 0 })),
      pinnedGames: (row.pinned_games ?? []).map(toGame),
      recentGames: (row.recent_games ?? []).map(toGame),
      trophies: (row.trophies ?? []).map(toTrophy),
      trophyCounts: toTrophyCounts(row.trophy_counts),
    };
  }
}
