// Player statistics tracking
// Persists game history and calculates performance metrics

import { safeLocalStorage } from './storage';

const STATS_STORAGE_KEY = 'wizard-party-player-stats';

export interface GameRecord {
  id: string;
  date: number;
  playerCount: number;
  placement: number; // 1 = first place
  score: number;
  rounds: RoundRecord[];
}

export interface RoundRecord {
  roundNumber: number;
  cardsInHand: number;
  bid: number;
  tricksWon: number;
  roundScore: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  totalRounds: number;
  correctBids: number;
  totalBids: number;
  totalTricksWon: number;
  highestScore: number;
  lowestScore: number;
  winStreak: number;
  currentStreak: number;
  gameHistory: GameRecord[];
}

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  totalRounds: 0,
  correctBids: 0,
  totalBids: 0,
  totalTricksWon: 0,
  highestScore: 0,
  lowestScore: 0,
  winStreak: 0,
  currentStreak: 0,
  gameHistory: [],
};

export function loadPlayerStats(): PlayerStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  const saved = safeLocalStorage.readJson(STATS_STORAGE_KEY);
  return saved && typeof saved === 'object' ? { ...DEFAULT_STATS, ...saved } : DEFAULT_STATS;
}

export function savePlayerStats(stats: PlayerStats): void {
  if (typeof window === 'undefined') return;
  // Keep only last 50 games in history
  const trimmedStats = {
    ...stats,
    gameHistory: stats.gameHistory.slice(-50),
  };
  safeLocalStorage.writeJson(STATS_STORAGE_KEY, trimmedStats);
}

export function recordGameResult(
  stats: PlayerStats,
  placement: number,
  score: number,
  playerCount: number,
  rounds: RoundRecord[],
  id = `game-${Date.now()}`
): PlayerStats {
  const isWin = placement === 1;

  // Calculate round stats
  let correctBids = 0;
  let totalTricks = 0;
  for (const round of rounds) {
    if (round.bid === round.tricksWon) {
      correctBids++;
    }
    totalTricks += round.tricksWon;
  }

  const gameRecord: GameRecord = {
    id,
    date: Date.now(),
    playerCount,
    placement,
    score,
    rounds,
  };

  const newStats: PlayerStats = {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (isWin ? 1 : 0),
    totalScore: stats.totalScore + score,
    totalRounds: stats.totalRounds + rounds.length,
    correctBids: stats.correctBids + correctBids,
    totalBids: stats.totalBids + rounds.length,
    totalTricksWon: stats.totalTricksWon + totalTricks,
    highestScore: Math.max(stats.highestScore, score),
    lowestScore: stats.gamesPlayed === 0 ? score : Math.min(stats.lowestScore, score),
    currentStreak: isWin ? stats.currentStreak + 1 : 0,
    winStreak: isWin ? Math.max(stats.winStreak, stats.currentStreak + 1) : stats.winStreak,
    gameHistory: [...stats.gameHistory, gameRecord],
  };

  savePlayerStats(newStats);
  return newStats;
}

export function getWinRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return (stats.gamesWon / stats.gamesPlayed) * 100;
}

export function getBidAccuracy(stats: PlayerStats): number {
  if (stats.totalBids === 0) return 0;
  return (stats.correctBids / stats.totalBids) * 100;
}

export function getAverageScore(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return stats.totalScore / stats.gamesPlayed;
}

export function getAveragePlacement(stats: PlayerStats): number {
  if (stats.gameHistory.length === 0) return 0;
  const sum = stats.gameHistory.reduce((acc, game) => acc + game.placement, 0);
  return sum / stats.gameHistory.length;
}

export function resetPlayerStats(): PlayerStats {
  savePlayerStats(DEFAULT_STATS);
  return DEFAULT_STATS;
}
