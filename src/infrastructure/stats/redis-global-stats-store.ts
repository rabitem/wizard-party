import 'server-only';

import type { Redis } from '@upstash/redis';

import type { IGlobalStatsStore } from '@shared/application/ports/stats';
import type { GameStatsContribution, GlobalStats } from '@shared/domain/stats';

import { getRedis } from '@/lib/redis';

const TOTAL_KEYS: Readonly<Record<keyof GlobalStats, string>> = {
  gamesPlayed: 'stats:games_played',
  roundsPlayed: 'stats:rounds_played',
  wizardsPlayed: 'stats:wizards_played',
  jestersPlayed: 'stats:jesters_played',
  cardsPlayed: 'stats:cards_played',
  tricksPlayed: 'stats:tricks_played',
  perfectBids: 'stats:perfect_bids',
  totalBids: 'stats:total_bids',
  highestScore: 'stats:highest_score',
  comebackWins: 'stats:comeback_wins',
};

const RECORDED_GAME_PREFIX = 'stats:recorded_game:';
/** Telemetry redelivery ends long before this; the marker only has to outlive retries. */
const RECORDED_GAME_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * One atomic script: the per-game marker, the highest score and every counter, so a game is
 * either counted completely or not at all. KEYS = [marker, highestScore, ...counters],
 * ARGV = [ttl, score, ...increments].
 */
const RECORD_GAME = `
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1]) then return 0 end
local score = tonumber(ARGV[2])
if score > (tonumber(redis.call('GET', KEYS[2])) or 0) then redis.call('SET', KEYS[2], score) end
for i = 3, #KEYS do redis.call('INCRBY', KEYS[i], ARGV[i]) end
return 1`;

type StatsRedis = Pick<Redis, 'eval' | 'mget'>;

/** Global totals in Upstash Redis (the keys predate this store and keep their history). */
export class RedisGlobalStatsStore implements IGlobalStatsStore {
  constructor(private readonly getClient: () => StatsRedis | null = getRedis) {}

  async read(): Promise<Partial<Record<keyof GlobalStats, unknown>> | null> {
    const redis = this.getClient();
    if (!redis) return null;
    const fields = Object.keys(TOTAL_KEYS) as (keyof GlobalStats)[];
    const values = await redis.mget<unknown[]>(fields.map((field) => TOTAL_KEYS[field]));
    return Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  }

  async record(gameId: string, contribution: GameStatsContribution): Promise<boolean> {
    const redis = this.getClient();
    if (!redis) return false;
    const increments: [string, number][] = [
      [TOTAL_KEYS.gamesPlayed, 1],
      [TOTAL_KEYS.roundsPlayed, contribution.roundsPlayed],
      [TOTAL_KEYS.wizardsPlayed, contribution.wizardsPlayed],
      [TOTAL_KEYS.jestersPlayed, contribution.jestersPlayed],
      [TOTAL_KEYS.cardsPlayed, contribution.cardsPlayed],
      [TOTAL_KEYS.tricksPlayed, contribution.tricksPlayed],
      [TOTAL_KEYS.perfectBids, contribution.perfectBids],
      [TOTAL_KEYS.totalBids, contribution.totalBids],
      [TOTAL_KEYS.comebackWins, contribution.hadComeback ? 1 : 0],
    ];
    const result = await redis.eval(
      RECORD_GAME,
      [`${RECORDED_GAME_PREFIX}${gameId}`, TOTAL_KEYS.highestScore, ...increments.map(([key]) => key)],
      [RECORDED_GAME_TTL_SECONDS, contribution.highestScore, ...increments.map(([, amount]) => amount)]
    );
    return Number(result) === 1;
  }
}
