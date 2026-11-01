import { NextResponse } from 'next/server';

import { GetGlobalStatsUseCase } from '@shared/application/use-cases/stats';
import type { GlobalStats } from '@shared/domain/stats';

import type { GlobalStatsResponse } from '@/app/api/types/global-stats.types';
import { RedisGlobalStatsStore } from '@/infrastructure/stats/redis-global-stats-store';

export const dynamic = 'force-dynamic';

const getGlobalStats = new GetGlobalStatsUseCase(new RedisGlobalStatsStore());

/** Sample data for deployments without Redis (local development). */
const MOCK_STATS: GlobalStats = {
  gamesPlayed: 42,
  roundsPlayed: 420,
  wizardsPlayed: 1337,
  jestersPlayed: 666,
  cardsPlayed: 8420,
  tricksPlayed: 2100,
  perfectBids: 840,
  totalBids: 2520,
  highestScore: 180,
  comebackWins: 13,
};

/**
 * Public, read-only totals. They are recorded server-side when the game worker reports a completed
 * game (POST /api/telemetry/ingest), never from browsers.
 */
export async function GET(): Promise<NextResponse<GlobalStatsResponse>> {
  try {
    const stats = await getGlobalStats.execute();
    if (stats) return NextResponse.json({ ...stats, isMock: false });
    console.warn('[Stats] Redis not configured, returning sample data');
  } catch (error) {
    console.error('[Stats] Failed to fetch stats:', error);
  }
  return NextResponse.json({ ...MOCK_STATS, isMock: true });
}
