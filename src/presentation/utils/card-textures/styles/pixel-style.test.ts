import { describe, expect, it } from 'vitest';
import { Suit } from '@shared/domain';
import { CARD_BACK_DESIGNS } from '../../../components/settings/card-back-presets';
import { CARD_THEMES, type CardTheme } from '../../../components/settings/card-theme-presets';
import { CARD_NUMBER_SIZE_PRESETS } from '../../../components/settings/visual-presets';
import { paintPixelBack } from '../card-backs/pixel-back';
import { createRecordingContext, hashOps, opNames, type RecordedOp } from '../recording-context.test-helper';
import { PIXEL_FONTS } from './pixel-font';
import { PIXEL_GRID_COLS } from './pixel-primitives';
import { JESTER_SPRITE, MOON, SPARKLE, SUIT_SPRITES, WIZARD_SPRITE } from './pixel-sprites';
import { drawPixelJesterCard, drawPixelNumberCard, drawPixelWizardCard } from './pixel-style';

const W = 512;
const H = 768;
const ROWS = Math.round((PIXEL_GRID_COLS * H) / W);

function pixelTheme(): CardTheme {
  const theme = CARD_THEMES.find((t) => t.id === 'pixel');
  if (!theme) throw new Error('Missing pixel card theme');
  return theme;
}

function drawNumberOps(value: number, suit: Suit = Suit.GIANTS, sizeIndex = 1): RecordedOp[] {
  const theme = pixelTheme();
  const { ctx, ops } = createRecordingContext();
  drawPixelNumberCard({
    ctx,
    w: W,
    h: H,
    suit,
    value,
    theme: theme.suits[suit],
    fontSizes: CARD_NUMBER_SIZE_PRESETS[sizeIndex].fontSizes,
    suitSymbols: {
      [Suit.GIANTS]: theme.suits.GIANTS.canvasSymbol,
      [Suit.ELVES]: theme.suits.ELVES.canvasSymbol,
      [Suit.DWARVES]: theme.suits.DWARVES.canvasSymbol,
      [Suit.HUMANS]: theme.suits.HUMANS.canvasSymbol,
    },
  });
  return ops;
}

function drawSpecialOps(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  draw(ctx, W, H);
  return ops;
}

function drawBackOps(): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  paintPixelBack(ctx, { w: W, h: H }, CARD_BACK_DESIGNS.pixel.palette);
  return ops;
}

function fillRects(ops: RecordedOp[]): number[][] {
  return ops.filter((op) => op.name === 'fillRect').map((op) => op.args as number[]);
}

function expectOnGrid(ops: RecordedOp[]): void {
  const rects = fillRects(ops);
  expect(rects.length).toBeGreaterThan(50);
  const offGrid = rects.filter(
    ([x, y, w, h]) => ![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || x + w > PIXEL_GRID_COLS || y + h > ROWS
  );
  expect(offGrid).toEqual([]);
}

describe('pixel card art style: sprites and fonts', () => {
  const sprites = { ...SUIT_SPRITES, WIZARD_SPRITE, JESTER_SPRITE, SPARKLE, MOON };

  it.each(Object.entries(sprites))('should keep every row of %s the same width', (_name, sprite) => {
    const widths = new Set(sprite.map((row) => row.length));
    expect(widths.size).toBe(1);
  });

  it.each(Object.entries(PIXEL_FONTS))('should size every %s glyph to the font box', (_name, font) => {
    for (const glyph of Object.values(font.glyphs)) {
      expect(glyph).toHaveLength(font.height);
      expect(glyph.every((row) => row.length === font.width)).toBe(true);
    }
  });

  it('should cover every suit name and court title in the small font', () => {
    const names = Object.values(pixelTheme().suits).map((s) => s.name);
    for (const char of [...names, 'WIZARD', 'JESTER', 'INSERT COIN'].join('').replace(/ /g, '')) {
      expect(PIXEL_FONTS.small.glyphs[char as keyof typeof PIXEL_FONTS.small.glyphs]).toBeDefined();
    }
  });
});

describe('pixel card art style: renderer', () => {
  it('should paint on the low-res grid with smoothing disabled', () => {
    const ops = drawNumberOps(7);
    expect(ops).toContainEqual({ name: 'set:imageSmoothingEnabled', args: [false] });
    expect(ops).toContainEqual({ name: 'scale', args: [W / PIXEL_GRID_COLS, H / ROWS] });
    expectOnGrid(ops);
  });

  it('should draw blocks only (no fonts, curves or gradients)', () => {
    for (const ops of [drawNumberOps(12), drawSpecialOps(drawPixelWizardCard), drawSpecialOps(drawPixelJesterCard)]) {
      const names = opNames(ops);
      for (const banned of ['fillText', 'arc', 'createLinearGradient', 'createRadialGradient']) {
        expect(names.has(banned)).toBe(false);
      }
    }
  });

  it('should draw different values differently', () => {
    expect(hashOps(drawNumberOps(5))).not.toBe(hashOps(drawNumberOps(6)));
  });

  it('should render every card in the deck within the grid', () => {
    for (const suit of Object.values(Suit)) {
      for (const value of [1, 9, 10, 13]) {
        for (const sizeIndex of [0, 2]) expectOnGrid(drawNumberOps(value, suit, sizeIndex));
      }
    }
  });

  it('should paint distinct wizard and jester faces on the grid', () => {
    const wizard = drawSpecialOps(drawPixelWizardCard);
    const jester = drawSpecialOps(drawPixelJesterCard);
    expectOnGrid(wizard);
    expectOnGrid(jester);
    expect(hashOps(wizard)).not.toBe(hashOps(jester));
  });
});

describe('pixel card art style: card back', () => {
  it('should paint the back on the grid using the pack palette', () => {
    const ops = drawBackOps();
    expectOnGrid(ops);
    const colors = new Set(ops.filter((op) => op.name === 'set:fillStyle').map((op) => op.args[0]));
    const { palette } = CARD_BACK_DESIGNS.pixel;
    for (const color of [palette.metal, palette.accent, palette.ink, palette.glow]) expect(colors.has(color)).toBe(true);
  });
});
