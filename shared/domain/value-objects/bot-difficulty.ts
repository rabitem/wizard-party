/**
 * Bot Difficulty (value object)
 *
 * The level of a bot seat: 1 = Novice, 2 = Easy, 3 = Medium, 4 = Hard, 5 = Expert.
 * Whatever arrives (a client command, stored state, a test) is parsed into a valid
 * level, so the bot AI can always look up its configuration.
 */

export const BOT_DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export type BotDifficultyLevel = (typeof BOT_DIFFICULTY_LEVELS)[number];

export const MIN_BOT_DIFFICULTY_LEVEL: BotDifficultyLevel = 1;
export const MAX_BOT_DIFFICULTY_LEVEL: BotDifficultyLevel = 5;
/** Medium: the level used when none (or garbage) is given. */
export const DEFAULT_BOT_DIFFICULTY_LEVEL: BotDifficultyLevel = 3;

export function isBotDifficultyLevel(value: unknown): value is BotDifficultyLevel {
  return (BOT_DIFFICULTY_LEVELS as readonly unknown[]).includes(value);
}

/**
 * A valid difficulty level: finite numbers are rounded and clamped to 1..5,
 * anything else falls back to `fallback` (Medium by default).
 */
export function parseBotDifficulty(
  value: unknown,
  fallback: BotDifficultyLevel = DEFAULT_BOT_DIFFICULTY_LEVEL
): BotDifficultyLevel {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const level = Math.min(MAX_BOT_DIFFICULTY_LEVEL, Math.max(MIN_BOT_DIFFICULTY_LEVEL, Math.round(value)));
  return isBotDifficultyLevel(level) ? level : fallback;
}
