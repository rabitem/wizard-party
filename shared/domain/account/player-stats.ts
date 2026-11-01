import { countCorrectBids, countTricksWon, type GameResult } from './game-result';

/** Lifetime counters of a player. Derived data: always recomputable from baseline + results. */
export interface PlayerStatsSummary {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  totalRounds: number;
  correctBids: number;
  totalBids: number;
  totalTricksWon: number;
  highestScore: number;
  /** null until the first game. */
  lowestScore: number | null;
  bestWinStreak: number;
  currentWinStreak: number;
  /** Sum of placements, for the average placement. */
  totalPlacement: number;
}

export const EMPTY_STATS: PlayerStatsSummary = Object.freeze({
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  totalRounds: 0,
  correctBids: 0,
  totalBids: 0,
  totalTricksWon: 0,
  highestScore: 0,
  lowestScore: null,
  bestWinStreak: 0,
  currentWinStreak: 0,
  totalPlacement: 0,
});

export function applyGameResult(stats: PlayerStatsSummary, result: GameResult): PlayerStatsSummary {
  const won = result.placement === 1;
  const currentWinStreak = won ? stats.currentWinStreak + 1 : 0;
  return {
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (won ? 1 : 0),
    totalScore: stats.totalScore + result.score,
    totalRounds: stats.totalRounds + result.rounds.length,
    correctBids: stats.correctBids + countCorrectBids(result),
    totalBids: stats.totalBids + result.rounds.length,
    totalTricksWon: stats.totalTricksWon + countTricksWon(result),
    highestScore: stats.gamesPlayed === 0 ? result.score : Math.max(stats.highestScore, result.score),
    lowestScore: stats.lowestScore === null ? result.score : Math.min(stats.lowestScore, result.score),
    bestWinStreak: Math.max(stats.bestWinStreak, currentWinStreak),
    currentWinStreak,
    totalPlacement: stats.totalPlacement + result.placement,
  };
}

/** Folds results (any order) onto a baseline in chronological order. */
export function aggregateStats(baseline: PlayerStatsSummary, results: readonly GameResult[]): PlayerStatsSummary {
  return [...results]
    .sort((a, b) => a.playedAt - b.playedAt || a.clientGameId.localeCompare(b.clientGameId))
    .reduce(applyGameResult, baseline);
}

const ratio = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

export function getWinRate(stats: PlayerStatsSummary): number {
  return ratio(stats.gamesWon, stats.gamesPlayed);
}

export function getBidAccuracy(stats: PlayerStatsSummary): number {
  return ratio(stats.correctBids, stats.totalBids);
}

export function getAverageScore(stats: PlayerStatsSummary): number {
  return ratio(stats.totalScore, stats.gamesPlayed);
}

export function getAveragePlacement(stats: PlayerStatsSummary): number {
  return ratio(stats.totalPlacement, stats.gamesPlayed);
}

/**
 * Counters from an older aggregate whose individual games are not all available (guest stats only
 * keep the last 50 games). The difference between the aggregate and the known games becomes the
 * baseline, so importing never double counts.
 */
export function deriveBaseline(aggregate: PlayerStatsSummary, knownResults: readonly GameResult[]): PlayerStatsSummary {
  const known = aggregateStats(EMPTY_STATS, knownResults);
  const nonNegative = (value: number) => Math.max(0, value);
  const remainingGames = nonNegative(aggregate.gamesPlayed - known.gamesPlayed);
  if (remainingGames === 0) return EMPTY_STATS;
  return {
    gamesPlayed: remainingGames,
    gamesWon: Math.min(remainingGames, nonNegative(aggregate.gamesWon - known.gamesWon)),
    totalScore: aggregate.totalScore - known.totalScore,
    totalRounds: nonNegative(aggregate.totalRounds - known.totalRounds),
    correctBids: nonNegative(aggregate.correctBids - known.correctBids),
    totalBids: nonNegative(aggregate.totalBids - known.totalBids),
    totalTricksWon: nonNegative(aggregate.totalTricksWon - known.totalTricksWon),
    highestScore: aggregate.highestScore,
    lowestScore: aggregate.lowestScore,
    bestWinStreak: aggregate.bestWinStreak,
    // Streaks continue through the known games, which are newer than the baseline.
    currentWinStreak: 0,
    totalPlacement: nonNegative(aggregate.totalPlacement - known.totalPlacement),
  };
}
