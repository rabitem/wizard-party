import type { LeaderboardCategory, LeaderboardEntry } from '@shared/domain/account/leaderboard';

export interface CategoryCopy {
  label: string;
  /** Primary figure shown for an entry. */
  value(entry: LeaderboardEntry): string;
  /** Secondary line under the figure. */
  detail(entry: LeaderboardEntry): string;
}

const plural = (count: number, word: string) => `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

export const CATEGORY_COPY: Record<LeaderboardCategory, CategoryCopy> = {
  level: {
    label: 'Level',
    value: (e) => `Lv ${e.level}`,
    detail: (e) => `${e.value.toLocaleString('en-US')} XP`,
  },
  wins: {
    label: 'Victories',
    value: (e) => e.value.toLocaleString('en-US'),
    detail: (e) => `of ${plural(e.gamesPlayed, 'game')}`,
  },
  'win-rate': {
    label: 'Win rate',
    value: (e) => `${Math.round(e.value * 100)}%`,
    detail: (e) => `over ${plural(e.gamesPlayed, 'game')}`,
  },
  'best-score': {
    label: 'Best score',
    value: (e) => e.value.toLocaleString('en-US'),
    detail: () => 'points in one game',
  },
};

/** Gold, silver, bronze for the podium; everything else plain. */
export const MEDAL_STYLES: Record<number, { ring: string; text: string; glow: string; label: string }> = {
  1: { ring: '#f0c674', text: '#f6d58a', glow: 'rgba(240,198,116,0.35)', label: 'First place' },
  2: { ring: '#cbd5e1', text: '#e2e8f0', glow: 'rgba(203,213,225,0.25)', label: 'Second place' },
  3: { ring: '#d08a4e', text: '#e7a76f', glow: 'rgba(208,138,78,0.28)', label: 'Third place' },
};
