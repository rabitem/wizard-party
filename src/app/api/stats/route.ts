import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Initialize Redis client (lazy - only when env vars exist)
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Global stats keys
const STATS_KEYS = {
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
} as const;

export interface GlobalStats {
  gamesPlayed: number;
  roundsPlayed: number;
  wizardsPlayed: number;
  jestersPlayed: number;
  cardsPlayed: number;
  tricksPlayed: number;
  perfectBids: number;
  totalBids: number;
  highestScore: number;
  comebackWins: number;
}

// Mock data for development
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

// GET - Fetch all global stats
export async function GET() {
  try {
    const redis = getRedis();

    if (!redis) {
      // Return mock data for development
      return NextResponse.json(MOCK_STATS);
    }

    const [
      gamesPlayed,
      roundsPlayed,
      wizardsPlayed,
      jestersPlayed,
      cardsPlayed,
      tricksPlayed,
      perfectBids,
      totalBids,
      highestScore,
      comebackWins,
    ] = await Promise.all([
      redis.get<number>(STATS_KEYS.gamesPlayed),
      redis.get<number>(STATS_KEYS.roundsPlayed),
      redis.get<number>(STATS_KEYS.wizardsPlayed),
      redis.get<number>(STATS_KEYS.jestersPlayed),
      redis.get<number>(STATS_KEYS.cardsPlayed),
      redis.get<number>(STATS_KEYS.tricksPlayed),
      redis.get<number>(STATS_KEYS.perfectBids),
      redis.get<number>(STATS_KEYS.totalBids),
      redis.get<number>(STATS_KEYS.highestScore),
      redis.get<number>(STATS_KEYS.comebackWins),
    ]);

    const stats: GlobalStats = {
      gamesPlayed: gamesPlayed ?? 0,
      roundsPlayed: roundsPlayed ?? 0,
      wizardsPlayed: wizardsPlayed ?? 0,
      jestersPlayed: jestersPlayed ?? 0,
      cardsPlayed: cardsPlayed ?? 0,
      tricksPlayed: tricksPlayed ?? 0,
      perfectBids: perfectBids ?? 0,
      totalBids: totalBids ?? 0,
      highestScore: highestScore ?? 0,
      comebackWins: comebackWins ?? 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(MOCK_STATS); // Fallback to mock on error
  }
}

// POST - Record game stats
export async function POST(request: Request) {
  try {
    const redis = getRedis();

    if (!redis) {
      // Just acknowledge in development
      return NextResponse.json({ success: true, dev: true });
    }

    const body = await request.json();
    const {
      roundsPlayed = 0,
      wizardsPlayed = 0,
      jestersPlayed = 0,
      cardsPlayed = 0,
      tricksPlayed = 0,
      perfectBids = 0,
      totalBids = 0,
      highestScore = 0,
      hadComeback = false,
    } = body;

    // Use pipeline for atomic increments
    const pipeline = redis.pipeline();

    pipeline.incr(STATS_KEYS.gamesPlayed);
    pipeline.incrby(STATS_KEYS.roundsPlayed, roundsPlayed);
    pipeline.incrby(STATS_KEYS.wizardsPlayed, wizardsPlayed);
    pipeline.incrby(STATS_KEYS.jestersPlayed, jestersPlayed);
    pipeline.incrby(STATS_KEYS.cardsPlayed, cardsPlayed);
    pipeline.incrby(STATS_KEYS.tricksPlayed, tricksPlayed);
    pipeline.incrby(STATS_KEYS.perfectBids, perfectBids);
    pipeline.incrby(STATS_KEYS.totalBids, totalBids);

    if (hadComeback) {
      pipeline.incr(STATS_KEYS.comebackWins);
    }

    await pipeline.exec();

    // Update highest score if new record (separate operation)
    const currentHighest = await redis.get<number>(STATS_KEYS.highestScore) ?? 0;
    if (highestScore > currentHighest) {
      await redis.set(STATS_KEYS.highestScore, highestScore);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record stats:', error);
    return NextResponse.json({ error: 'Failed to record stats' }, { status: 500 });
  }
}
