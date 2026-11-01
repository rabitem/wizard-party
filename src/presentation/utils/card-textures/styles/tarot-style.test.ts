import { describe, expect, it } from 'vitest';
import { Suit } from '@shared/domain';
import { TREND_CARD_THEMES } from '../../../components/settings/trend-card-themes';
import { CARD_NUMBER_SIZE_PRESETS } from '../../../components/settings/visual-presets';
import { createRecordingContext, type RecordedOp } from '../recording-context.test-helper';
import { toRoman } from './tarot-primitives';
import { drawTarotJesterCard, drawTarotNumberCard, drawTarotWizardCard } from './tarot-style';

const W = 512;
const H = 768;
const TAROT_THEME = (() => {
  const theme = TREND_CARD_THEMES.find((t) => t.id === 'celestial');
  if (!theme) throw new Error('Missing celestial card theme');
  return theme;
})();
const SUIT_SYMBOLS = Object.fromEntries(Object.values(Suit).map((suit) => [suit, TAROT_THEME.suits[suit].canvasSymbol])) as Record<
  Suit,
  string
>;

function numberCardOps(suit: Suit, value: number): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  drawTarotNumberCard({
    ctx,
    w: W,
    h: H,
    suit,
    value,
    theme: TAROT_THEME.suits[suit],
    fontSizes: CARD_NUMBER_SIZE_PRESETS[1].fontSizes,
    suitSymbols: SUIT_SYMBOLS,
  });
  return ops;
}

function specialOps(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  draw(ctx, W, H);
  return ops;
}

function texts(ops: RecordedOp[]): unknown[] {
  return ops.filter((op) => op.name === 'fillText').map((op) => op.args[0]);
}

describe('tarot card art style', () => {
  it('should print the roman numeral on number cards', () => {
    expect(texts(numberCardOps(Suit.GIANTS, 11))).toContain('XI');
  });

  it('should title the wizard and jester cards like major arcana', () => {
    expect(texts(specialOps(drawTarotWizardCard))).toContain('I');
    expect(texts(specialOps(drawTarotJesterCard))).toContain('0');
  });

  it('should convert values to roman numerals', () => {
    expect([1, 4, 9, 13, 14].map(toRoman)).toEqual(['I', 'IV', 'IX', 'XIII', 'XIV']);
  });
});
