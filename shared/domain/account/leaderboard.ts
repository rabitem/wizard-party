import { getProgression } from './progression';
import { EMPTY_STATS, getWinRate, type PlayerStatsSummary } from './player-stats';

/**
 * Public leaderboard ("Hall of Champions"). Only players with a public profile are candidates.
 * Adding a board = adding a category definition.
 */
export const LEADERBOARD_RULES = {
  /** Entries shown per board. */
  SIZE: 10,
  /** Win rate is meaningless for a handful of games. */
  MIN_GAMES_FOR_WIN_RATE: 10,
  /** Candidates loaded from storage (highest XP first); far above the active player base. */
  MAX_CANDIDATES: 2000,
} as const;

export const LEADERBOARD_CATEGORIES = ['level', 'wins', 'win-rate', 'best-score'] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

export interface LeaderboardCandidate {
  username: string;
  /** The username as the player spells it. */
  displayName: string;
  avatar: string;
  totalXp: number;
  stats: PlayerStatsSummary;
}

export interface LeaderboardEntry {
  /** Competition ranking: equal values share a rank (1, 1, 3). */
  rank: number;
  username: string;
  displayName: string;
  avatar: string;
  level: number;
  title: string;
  gamesPlayed: number;
  /** The metric of the board (XP, wins, win rate 0..1, score). */
  value: number;
}

interface CategoryDefinition {
  eligible(candidate: LeaderboardCandidate): boolean;
  value(candidate: LeaderboardCandidate): number;
}

const CATEGORIES: Record<LeaderboardCategory, CategoryDefinition> = {
  level: { eligible: (c) => c.totalXp > 0, value: (c) => c.totalXp },
  wins: { eligible: (c) => c.stats.gamesWon > 0, value: (c) => c.stats.gamesWon },
  'win-rate': {
    eligible: (c) => c.stats.gamesPlayed >= LEADERBOARD_RULES.MIN_GAMES_FOR_WIN_RATE,
    value: (c) => getWinRate(c.stats),
  },
  'best-score': { eligible: (c) => c.stats.gamesPlayed > 0, value: (c) => c.stats.highestScore },
};

export function rankLeaderboard(
  category: LeaderboardCategory,
  candidates: readonly LeaderboardCandidate[],
  size: number = LEADERBOARD_RULES.SIZE
): LeaderboardEntry[] {
  const definition = CATEGORIES[category];
  const sorted = candidates
    .filter((candidate) => definition.eligible(candidate))
    .map((candidate) => ({ candidate, value: definition.value(candidate) }))
    // Ties: more experienced player first, then alphabetical for a stable order.
    .sort((a, b) => b.value - a.value || b.candidate.totalXp - a.candidate.totalXp || a.candidate.username.localeCompare(b.candidate.username))
    .slice(0, size);

  return sorted.map(({ candidate, value }, index) => {
    const firstWithValue = sorted.findIndex((entry) => entry.value === value);
    const progression = getProgression(candidate.totalXp);
    return {
      rank: firstWithValue === -1 ? index + 1 : firstWithValue + 1,
      username: candidate.username,
      displayName: candidate.displayName,
      avatar: candidate.avatar,
      level: progression.level,
      title: progression.title,
      gamesPlayed: candidate.stats.gamesPlayed,
      value,
    };
  });
}

export type Leaderboards = Record<LeaderboardCategory, LeaderboardEntry[]>;

export function buildLeaderboards(candidates: readonly LeaderboardCandidate[]): Leaderboards {
  return Object.fromEntries(LEADERBOARD_CATEGORIES.map((category) => [category, rankLeaderboard(category, candidates)])) as Leaderboards;
}

/** Fills a partially stored summary (older rows) with defaults. */
export function completeStats(summary: Partial<PlayerStatsSummary> | null): PlayerStatsSummary {
  return { ...EMPTY_STATS, ...(summary ?? {}) };
}
