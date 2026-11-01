import { describe, expect, it } from 'vitest';
import { CARD_THEMES } from '@/presentation/components/settings/card-theme-presets';
import { SUIT_GLYPH } from '@/presentation/config/card-render.config';
import { createRecordingContext } from '../recording-context.test-helper';
import { fillSymbolText, strokeSymbolText } from './index';

/** Every suit symbol a card theme draws on its faces */
const THEME_SUIT_SYMBOLS = [
  ...new Set(CARD_THEMES.flatMap((theme) => Object.values(theme.suits).map((suit) => suit.canvasSymbol))),
];

/** On-curve points of the traced path (line ends and curve end points) */
function pathPoints(ops: { name: string; args: unknown[] }[]): Array<[number, number]> {
  return ops.flatMap((op): Array<[number, number]> => {
    if (op.name === 'moveTo' || op.name === 'lineTo') return [[op.args[0] as number, op.args[1] as number]];
    if (op.name === 'bezierCurveTo') return [[op.args[4] as number, op.args[5] as number]];
    return [];
  });
}

describe('suit glyphs', () => {
  it.each(THEME_SUIT_SYMBOLS)('should fill the %s suit symbol as a vector path, never as font text', (symbol) => {
    const { ctx, ops } = createRecordingContext();
    ctx.font = '100px Arial';
    fillSymbolText(ctx, symbol, 200, 300);

    expect(ops.some((op) => op.name === 'fillText')).toBe(false);
    expect(ops.filter((op) => op.name === 'fill')).toHaveLength(1);
    const points = pathPoints(ops);
    expect(points.length).toBeGreaterThan(2);
    // Centred on (x, y) and inside the em box the font glyph used to occupy
    const half = (100 * SUIT_GLYPH.EM_SCALE) / 2 + 1;
    for (const [x, y] of points) {
      expect(Math.abs(x - 200)).toBeLessThanOrEqual(half);
      expect(Math.abs(y - 300)).toBeLessThanOrEqual(half);
    }
  });

  it('should scale with the context font size', () => {
    const extent = (font: string) => {
      const { ctx, ops } = createRecordingContext();
      ctx.font = font;
      fillSymbolText(ctx, '◆', 0, 0);
      return Math.max(...pathPoints(ops).map(([, y]) => Math.abs(y)));
    };
    expect(extent('bold 120px Georgia')).toBeCloseTo(extent('60px Arial') * 2, 6);
  });

  it('should stroke outlines for neon and ink rims', () => {
    const { ctx, ops } = createRecordingContext();
    ctx.font = '80px Arial';
    strokeSymbolText(ctx, '⚙', 0, 0);
    expect(ops.some((op) => op.name === 'stroke')).toBe(true);
    expect(ops.some((op) => op.name === 'strokeText')).toBe(false);
  });

  it('should draw words and numbers as text, and unknown symbols in text presentation', () => {
    const { ctx, ops } = createRecordingContext();
    ctx.font = '40px Arial';
    fillSymbolText(ctx, '11', 0, 0);
    fillSymbolText(ctx, 'GIANTS', 0, 0);
    fillSymbolText(ctx, '♫', 0, 0);
    const texts = ops.filter((op) => op.name === 'fillText').map((op) => op.args[0]);
    expect(texts).toEqual(['11', 'GIANTS', '♫︎']);
  });
});
