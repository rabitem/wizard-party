import { XP_RULES } from './account.constants';
import { countCorrectBids, type GameResult } from './game-result';
import type { PlayerStatsSummary } from './player-stats';

export interface Progression {
  level: number;
  title: string;
  totalXp: number;
  /** XP earned inside the current level. */
  levelXp: number;
  /** XP the current level needs in total; levelXp / levelSpan is the progress bar. */
  levelSpan: number;
}

/** Titles unlock as levels are reached; the highest reached one is shown. */
export const LEVEL_TITLES: readonly { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Apprentice' },
  { minLevel: 3, title: 'Hedge Mage' },
  { minLevel: 6, title: 'Conjurer' },
  { minLevel: 10, title: 'Sorcerer' },
  { minLevel: 15, title: 'Warlock' },
  { minLevel: 20, title: 'Archmage' },
  { minLevel: 30, title: 'Grand Archmage' },
  { minLevel: 50, title: 'Eternal Wizard' },
];

export function xpForGame(result: GameResult): number {
  const opponents = Math.max(0, result.playerCount - 1);
  const tableBonus = 1 + Math.max(0, opponents - 2) * XP_RULES.PER_EXTRA_OPPONENT;
  const placementBonus = result.placement === 1 ? XP_RULES.WIN_BONUS : result.placement === 2 ? XP_RULES.WIN_BONUS / 2 : 0;
  const earned = XP_RULES.PER_GAME + countCorrectBids(result) * XP_RULES.PER_CORRECT_BID + placementBonus;
  return Math.round(earned * tableBonus);
}

/**
 * XP for games whose details are unknown (imported aggregates): average participation XP plus
 * the win bonus per win, so imported veterans start at a fair level.
 */
export function xpForBaseline(baseline: PlayerStatsSummary): number {
  return (
    baseline.gamesPlayed * XP_RULES.PER_GAME +
    baseline.correctBids * XP_RULES.PER_CORRECT_BID +
    baseline.gamesWon * XP_RULES.WIN_BONUS
  );
}

/** XP needed to go from `level` to `level + 1`. Grows linearly so early levels come quickly. */
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

/**
 * Total XP needed to reach `level` from zero (closed form of summing xpToNextLevel).
 * The curve is deliberately unchanged: levels are derived from XP on every read, so changing it
 * would silently re-level every existing player. ~100 XP per game puts Sorcerer (L10) at ~40
 * games, Archmage (L20) at ~110 and the Legendary frame (L50) at ~640, which suits a long tail.
 */
export function totalXpForLevel(level: number): number {
  const steps = Math.max(0, Math.floor(level) - 1);
  return 100 * steps + 25 * steps * (steps - 1);
}

export function titleForLevel(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const entry of LEVEL_TITLES) if (level >= entry.minLevel) title = entry.title;
  return title;
}

export function getProgression(totalXp: number): Progression {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  return { level, title: titleForLevel(level), totalXp: Math.max(0, Math.floor(totalXp)), levelXp: remaining, levelSpan: xpToNextLevel(level) };
}
