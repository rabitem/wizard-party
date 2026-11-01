import type { GameResult, PlayerStatsSummary } from '@shared/domain/account';

import { loadPlayerStats, type GameRecord, type PlayerStats } from '@/lib/player-stats';

import type { AccountOverviewDto } from './account-api';

/** Ids of legacy records ("game-<ms>") are short; pad them into the idempotency key format. */
function clientGameId(record: GameRecord): string {
  const id = record.id.replace(/[^A-Za-z0-9_-]/g, '');
  return id.length >= 8 ? id.slice(0, 64) : `guest-${id}-${record.date}`;
}

export function gameRecordToResult(record: GameRecord): GameResult {
  return {
    clientGameId: clientGameId(record),
    playedAt: record.date,
    playerCount: record.playerCount,
    placement: record.placement,
    score: record.score,
    rounds: record.rounds.map(({ bid, tricksWon, roundScore }) => ({ bid, tricksWon, roundScore })),
  };
}

export function guestStatsToSummary(stats: PlayerStats): PlayerStatsSummary {
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    totalScore: stats.totalScore,
    totalRounds: stats.totalRounds,
    correctBids: stats.correctBids,
    totalBids: stats.totalBids,
    totalTricksWon: stats.totalTricksWon,
    highestScore: stats.highestScore,
    lowestScore: stats.gamesPlayed === 0 ? null : stats.lowestScore,
    bestWinStreak: stats.winStreak,
    currentWinStreak: stats.currentStreak,
    // Older guest stats did not track placements; approximate from the kept history.
    totalPlacement: Math.max(
      stats.gamesPlayed,
      Math.round(
        (stats.gameHistory.reduce((sum, game) => sum + game.placement, 0) / Math.max(1, stats.gameHistory.length)) *
          stats.gamesPlayed
      )
    ),
  };
}

export function loadGuestImportPayload(): { stats: PlayerStatsSummary; history: GameResult[] } | null {
  const stats = loadPlayerStats();
  if (stats.gamesPlayed === 0) return null;
  return { stats: guestStatsToSummary(stats), history: stats.gameHistory.slice(-50).map(gameRecordToResult) };
}

/** Lets the existing stats views render account stats without knowing about accounts. */
export function overviewToPlayerStats(overview: AccountOverviewDto): PlayerStats {
  const { stats } = overview;
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    totalScore: stats.totalScore,
    totalRounds: stats.totalRounds,
    correctBids: stats.correctBids,
    totalBids: stats.totalBids,
    totalTricksWon: stats.totalTricksWon,
    highestScore: stats.highestScore,
    lowestScore: stats.lowestScore ?? 0,
    winStreak: stats.bestWinStreak,
    currentStreak: stats.currentWinStreak,
    gameHistory: [...overview.recentGames].reverse().map((game) => ({
      id: game.clientGameId,
      date: game.playedAt,
      playerCount: game.playerCount,
      placement: game.placement,
      score: game.score,
      rounds: game.rounds.map((round, index) => ({ roundNumber: index + 1, cardsInHand: index + 1, ...round })),
    })),
  };
}
