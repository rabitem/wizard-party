import { describe, expect, it } from 'vitest';

import {
  NAME_SCORE_LEFT_CLASS,
  NAME_SCORE_TEXT_CLASS,
  NAME_SCORE_TEXT_FLEX_CLASS,
  NAME_SCORE_VALUE_CLASS,
  WINNER_NAME_LINE_CLASS,
  getNameScoreValueStyle,
} from './name-score-layout';

interface ScoreLaneWidthRow {
  label: string;
  args: Parameters<typeof getNameScoreValueStyle>;
  width: string;
}

/**
 * Width = max(min width, signed digits x character width + padding) x scale. Rows cover the
 * default lanes (44/9/12) and the standings columns (44/9/10, compact 30/8/8).
 */
const SCORE_LANE_WIDTHS: ScoreLaneWidthRow[] = [
  { label: 'a zero total keeps the minimum width', args: [1, [0]], width: '44px' },
  { label: 'a five-digit total and its plus sign widen the lane', args: [1, [99_999]], width: '66px' },
  { label: 'the longest total sets the lane', args: [1, [120, -50]], width: '48px' },
  { label: 'the lane scales with the row', args: [1.25, [0]], width: '55px' },
  { label: 'standings column, zero total', args: [1, [0], 44, 9, 10], width: '44px' },
  { label: 'standings column, negative five digits', args: [1, [-12_345], 44, 9, 10], width: '64px' },
  { label: 'compact standings, zero total', args: [1, [0], 30, 8, 8], width: '30px' },
  { label: 'compact standings, three digits', args: [1, [999], 30, 8, 8], width: '40px' },
];

describe('name and score layout', () => {
  it('keeps player-name lanes shrinkable before score columns', () => {
    expect(NAME_SCORE_LEFT_CLASS).toContain('min-w-0');
    expect(NAME_SCORE_LEFT_CLASS).toContain('flex-1');
    expect(NAME_SCORE_LEFT_CLASS).toContain('overflow-hidden');
    expect(NAME_SCORE_TEXT_CLASS).toContain('truncate');
    expect(NAME_SCORE_TEXT_CLASS).toContain('min-w-0');
    expect(NAME_SCORE_TEXT_FLEX_CLASS).toContain('flex-1');
    expect(NAME_SCORE_VALUE_CLASS).toContain('flex-shrink-0');
  });

  it.each(SCORE_LANE_WIDTHS)('widens score lanes for unusually large totals: $label', ({ args, width }) => {
    const style = getNameScoreValueStyle(...args);

    expect(style.width).toBe(width);
    expect(style.minWidth).toBe(width);
    expect(style.flexShrink).toBe(0);
  });

  it('keeps victory copy from letting a long winner name hide the score sentence', () => {
    expect(WINNER_NAME_LINE_CLASS).toContain('block');
    expect(WINNER_NAME_LINE_CLASS).toContain('max-w-full');
    expect(WINNER_NAME_LINE_CLASS).toContain('truncate');
  });
});
