import { getNameScoreValueStyle } from '../../name-score-layout';

export const LEADERBOARD_NAME_CELL_CLASS = 'flex-1 min-w-0 overflow-hidden';
export const LEADERBOARD_NAME_ROW_CLASS = 'flex items-center min-w-0';
export const LEADERBOARD_NAME_TEXT_CLASS = 'font-medium truncate min-w-0 flex-1';
export const LEADERBOARD_SCORE_COLUMN_CLASS = 'text-right flex-shrink-0 tabular-nums';
export const LEADERBOARD_VERTICAL_CONTENT_CLASS = 'p-1.5 pr-3 space-y-0.5';
/** "Tricks: won/bid" sub-row: the label truncates first, the value is never clipped */
export const LEADERBOARD_TRICKS_ROW_CLASS = 'flex items-center min-w-0';
export const LEADERBOARD_TRICKS_LABEL_CLASS = 'truncate min-w-0';
export const LEADERBOARD_TRICKS_VALUE_CLASS = 'font-medium flex-shrink-0 whitespace-nowrap tabular-nums';

export const COMPACT_LEADERBOARD_NAME_GROUP_CLASS = 'flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden';
export const COMPACT_LEADERBOARD_NAME_TEXT_CLASS = 'truncate min-w-0 flex-1';
export const COMPACT_LEADERBOARD_SCORE_CLASS = 'font-bold flex-shrink-0 tabular-nums text-right';

/** Vertical panel width at which rows render at LEADERBOARD_BASE_SCALE */
export const LEADERBOARD_PANEL_DEFAULT_WIDTH = 325;
/** Narrowest vertical panel that still leaves room for names and trick counts */
export const LEADERBOARD_PANEL_MIN_WIDTH = 300;
export const LEADERBOARD_PANEL_MAX_WIDTH = 500;
/** Row scale of the horizontal layout and of the vertical layout at its default width */
export const LEADERBOARD_BASE_SCALE = 1.25;
const LEADERBOARD_MIN_SCALE = 1;
const LEADERBOARD_MAX_SCALE = 1.6;

/**
 * Row scale for the standings panel. Vertical rows grow with the panel width, anchored so the
 * default width renders at the base scale; the panel is sized for that scale, so the name lane
 * keeps room for the name and the trick count.
 */
export function getLeaderboardPanelScale(width: number, horizontal: boolean): number {
  if (horizontal || !Number.isFinite(width)) return LEADERBOARD_BASE_SCALE;
  const scale = (width / LEADERBOARD_PANEL_DEFAULT_WIDTH) * LEADERBOARD_BASE_SCALE;
  return Math.max(LEADERBOARD_MIN_SCALE, Math.min(LEADERBOARD_MAX_SCALE, scale));
}

type ScoreColumnStyle = ReturnType<typeof getNameScoreValueStyle>;

export function getLeaderboardScoreColumnStyle(scale = 1, scoreValues: number[] = []): ScoreColumnStyle {
  return getNameScoreValueStyle(scale, scoreValues, 44, 9, 10);
}

export function getCompactLeaderboardScoreStyle(scale = 1, scoreValues: number[] = []): ScoreColumnStyle {
  return getNameScoreValueStyle(scale, scoreValues, 30, 8, 8);
}
