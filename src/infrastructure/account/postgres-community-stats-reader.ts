import 'server-only';

import type { ICommunityStatsReader } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

/**
 * One round trip over the telemetry read model (games / game_players) and auth_users.
 * Bots are excluded; guests count through their persistent player id.
 */
export class PostgresCommunityStatsReader implements ICommunityStatsReader {
  async read({ liveMinutes, todayHours }: { liveMinutes: number; todayHours: number }) {
    const rows = (await getSql()`
      SELECT
        (SELECT count(DISTINCT gp.player_id)
           FROM games g JOIN game_players gp ON gp.game_id = g.game_id
          WHERE g.status = 'in_progress' AND NOT gp.is_bot
            AND g.last_event_at > now() - make_interval(mins => ${liveMinutes}::int)) AS playing_now,
        (SELECT count(DISTINCT gp.player_id)
           FROM games g JOIN game_players gp ON gp.game_id = g.game_id
          WHERE NOT gp.is_bot AND g.last_event_at > now() - make_interval(hours => ${todayHours}::int)) AS players_today,
        (SELECT count(*) FROM games WHERE started_at > now() - make_interval(hours => ${todayHours}::int)) AS games_today,
        (SELECT count(*) FROM auth_users) AS registered_players
    `) as { playing_now: number; players_today: number; games_today: number; registered_players: number }[];
    const row = rows[0] ?? {};
    return {
      playingNow: row.playing_now,
      playersToday: row.players_today,
      gamesToday: row.games_today,
      registeredPlayers: row.registered_players,
    };
  }
}
