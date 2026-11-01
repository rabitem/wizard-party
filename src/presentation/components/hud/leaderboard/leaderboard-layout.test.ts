import { describe, expect, it } from 'vitest';

import {
  COMPACT_LEADERBOARD_NAME_GROUP_CLASS,
  COMPACT_LEADERBOARD_NAME_TEXT_CLASS,
  COMPACT_LEADERBOARD_SCORE_CLASS,
  LEADERBOARD_NAME_CELL_CLASS,
  LEADERBOARD_NAME_ROW_CLASS,
  LEADERBOARD_NAME_TEXT_CLASS,
  LEADERBOARD_SCORE_COLUMN_CLASS,
  LEADERBOARD_VERTICAL_CONTENT_CLASS,
  LEADERBOARD_BASE_SCALE,
  LEADERBOARD_PANEL_DEFAULT_WIDTH,
  LEADERBOARD_PANEL_MAX_WIDTH,
  LEADERBOARD_PANEL_MIN_WIDTH,
  LEADERBOARD_TRICKS_LABEL_CLASS,
  LEADERBOARD_TRICKS_ROW_CLASS,
  LEADERBOARD_TRICKS_VALUE_CLASS,
  getCompactLeaderboardScoreStyle,
  getLeaderboardPanelScale,
  getLeaderboardScoreColumnStyle,
} from './leaderboard-layout';

/**
 * Width model of a vertical standings row (LeaderboardPanel + LeaderboardRow).
 * Fixed: panel border 2+2, content padding 6+12, row padding 8+8 and border 1+1.
 * Scaled: position badge 28, avatar 28, three 8px gaps and the 44px score column.
 * Text: "Tricks:" (11px) + 3px gap + a "10/10" count (12px), at a Georgia-ish 0.6em advance.
 */
const ROW_FIXED_PX = 40;
const ROW_SCALED_PX = 28 + 28 + 3 * 8 + 44;
const TRICKS_TEXT_PX = 7 * 11 * 0.6 + 3 + 5 * 12 * 0.6;

function nameLaneWidth(panelWidth: number): number {
  return panelWidth - ROW_FIXED_PX - ROW_SCALED_PX * getLeaderboardPanelScale(panelWidth, false);
}

/**
 * Score lanes the standings reserve: max(min width, signed digits x character width + padding)
 * x scale, with 44/9/10 for the vertical panel and 30/8/8 for compact rows.
 */
const STANDINGS_SCORE_LANES = [
  { label: 'panel, zero total', lane: getLeaderboardScoreColumnStyle, scale: 1, scores: [0], width: '44px' },
  { label: 'panel, scaled row', lane: getLeaderboardScoreColumnStyle, scale: 1.25, scores: [0], width: '55px' },
  { label: 'panel, negative five digits', lane: getLeaderboardScoreColumnStyle, scale: 1, scores: [-12_345], width: '64px' },
  { label: 'compact, zero total', lane: getCompactLeaderboardScoreStyle, scale: 1, scores: [0], width: '30px' },
  { label: 'compact, three digits', lane: getCompactLeaderboardScoreStyle, scale: 1, scores: [999], width: '40px' },
];

describe('leaderboard layout', () => {
  // Lane arithmetic: name-score-layout.test.ts; the standings' own lane parameters are pinned
  // here. The class checks stay until a browser check proves long names truncate while scores and
  // trick counts stay visible.
  it('reserves a non-shrinking score column so long names cannot hide points', () => {
    expect(LEADERBOARD_SCORE_COLUMN_CLASS).toContain('flex-shrink-0');
  });

  it.each(STANDINGS_SCORE_LANES)('sizes the score lane to the largest total: $label', ({ lane, scale, scores, width }) => {
    const style = lane(scale, scores);

    expect(style.width).toBe(width);
    expect(style.minWidth).toBe(width);
  });

  it('keeps vertical standings numbers away from the scroll edge', () => {
    expect(LEADERBOARD_VERTICAL_CONTENT_CLASS).toContain('pr-3');
  });

  it('keeps the name lane shrinkable and truncated before the score lane', () => {
    expect(LEADERBOARD_NAME_CELL_CLASS).toContain('min-w-0');
    expect(LEADERBOARD_NAME_CELL_CLASS).toContain('overflow-hidden');
    expect(LEADERBOARD_NAME_ROW_CLASS).toContain('min-w-0');
    expect(LEADERBOARD_NAME_TEXT_CLASS).toContain('truncate');
    expect(LEADERBOARD_NAME_TEXT_CLASS).toContain('min-w-0');
    expect(LEADERBOARD_NAME_TEXT_CLASS).toContain('flex-1');
  });

  it('uses the same overflow-safe contract for compact standings', () => {
    expect(COMPACT_LEADERBOARD_NAME_GROUP_CLASS).toContain('min-w-0');
    expect(COMPACT_LEADERBOARD_NAME_GROUP_CLASS).toContain('flex-1');
    expect(COMPACT_LEADERBOARD_NAME_TEXT_CLASS).toContain('truncate');
    expect(COMPACT_LEADERBOARD_NAME_TEXT_CLASS).toContain('min-w-0');
    expect(COMPACT_LEADERBOARD_SCORE_CLASS).toContain('flex-shrink-0');
  });

  it('never clips the trick count: the label truncates first', () => {
    expect(LEADERBOARD_TRICKS_ROW_CLASS).toContain('min-w-0');
    expect(LEADERBOARD_TRICKS_LABEL_CLASS).toContain('truncate');
    expect(LEADERBOARD_TRICKS_LABEL_CLASS).toContain('min-w-0');
    expect(LEADERBOARD_TRICKS_VALUE_CLASS).toContain('flex-shrink-0');
    expect(LEADERBOARD_TRICKS_VALUE_CLASS).toContain('tabular-nums');
  });

  it('renders the default vertical panel at the base scale, like the horizontal layout', () => {
    expect(getLeaderboardPanelScale(LEADERBOARD_PANEL_DEFAULT_WIDTH, false)).toBe(LEADERBOARD_BASE_SCALE);
    expect(getLeaderboardPanelScale(LEADERBOARD_PANEL_DEFAULT_WIDTH, true)).toBe(LEADERBOARD_BASE_SCALE);
  });

  it('leaves the name lane room for the trick count at every vertical panel width', () => {
    for (let width = LEADERBOARD_PANEL_MIN_WIDTH; width <= LEADERBOARD_PANEL_MAX_WIDTH; width += 5) {
      const scale = getLeaderboardPanelScale(width, false);
      expect(nameLaneWidth(width)).toBeGreaterThanOrEqual(TRICKS_TEXT_PX * scale);
    }
  });
});
