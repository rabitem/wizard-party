import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardType, SPECIAL_CARD_TYPES, Suit, type SpecialCardType } from '@shared/domain';
import { CARD_THEMES, type CardArtStyle, type CardTheme } from '../../components/settings/card-theme-presets';
import { CARD_NUMBER_SIZE_PRESETS } from '../../components/settings/visual-presets';
import { getCardArtRenderer, type CardArtRenderer } from './card-art-styles';
import { createRecordingContext, hashOps, type RecordedOp } from './recording-context.test-helper';
import { getSpecialCardFace, layoutSpecialFace, splitValueLabel } from './special-cards';
import { PIXEL_GRID_COLS } from './styles/pixel-primitives';

const W = 512;
const H = 768;
const SUITS = Object.values(Suit);
type Draw = (ctx: CanvasRenderingContext2D) => void;

/** Every art style a deck uses, with the first deck that uses it */
const DECK_STYLES: Array<[CardArtStyle, CardTheme]> = (() => {
  const byStyle = new Map<CardArtStyle, CardTheme>();
  for (const theme of CARD_THEMES) {
    const style = theme.artStyle ?? 'classic';
    if (!byStyle.has(style)) byStyle.set(style, theme);
  }
  return [...byStyle.entries()];
})();
const ART_STYLES = DECK_STYLES.map(([style]) => style);

function themeById(id: string): CardTheme {
  const theme = CARD_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Missing card theme ${id}`);
  return theme;
}

function fontSizesOf(sizeId: string) {
  const preset = CARD_NUMBER_SIZE_PRESETS.find((p) => p.id === sizeId);
  if (!preset) throw new Error(`Missing number size preset ${sizeId}`);
  return preset.fontSizes;
}

function symbolsOf(theme: CardTheme): Record<Suit, string> {
  return {
    [Suit.GIANTS]: theme.suits.GIANTS.canvasSymbol,
    [Suit.ELVES]: theme.suits.ELVES.canvasSymbol,
    [Suit.DWARVES]: theme.suits.DWARVES.canvasSymbol,
    [Suit.HUMANS]: theme.suits.HUMANS.canvasSymbol,
  };
}

function record(draw: Draw): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  draw(ctx);
  return ops;
}

function numberCard(renderer: CardArtRenderer, theme: CardTheme, suit: Suit, value: number, sizeId = 'medium'): Draw {
  return (ctx) => renderer.drawNumberCard({
    ctx, w: W, h: H, suit, value, theme: theme.suits[suit], fontSizes: fontSizesOf(sizeId), suitSymbols: symbolsOf(theme),
  });
}

function specialCard(renderer: CardArtRenderer, type: SpecialCardType): Draw {
  return (ctx) => renderer.drawSpecialCard(ctx, W, H, type);
}

/** Number cards of every suit, the Wizard, the Jester and every special card */
function everyFace(renderer: CardArtRenderer, theme: CardTheme): Draw[] {
  return [
    ...SUITS.flatMap((suit) => [3, 12].map((value) => numberCard(renderer, theme, suit, value))),
    (ctx) => renderer.drawWizardCard(ctx, W, H),
    (ctx) => renderer.drawJesterCard(ctx, W, H),
    ...SPECIAL_CARD_TYPES.map((type) => specialCard(renderer, type)),
  ];
}

function texts(ops: RecordedOp[], names: readonly string[] = ['fillText']): unknown[] {
  return ops.filter((op) => names.includes(op.name)).map((op) => op.args[0]);
}

function count(ops: RecordedOp[], name: string): number {
  return ops.filter((op) => op.name === name).length;
}

function withMathRandom<T>(value: number, run: () => T): T {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(value);
  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getCardArtRenderer', () => {
  it('should fall back to classic for a missing or unknown style (saved by an older or newer client)', () => {
    const classic = getCardArtRenderer('classic');
    expect(getCardArtRenderer(undefined)).toBe(classic);
    expect(getCardArtRenderer('nope' as never)).toBe(classic);
  });
});

describe.each(DECK_STYLES)('%s card art style', (style, theme) => {
  const renderer = getCardArtRenderer(style);

  it('should draw number, Wizard, Jester and special faces the same regardless of Math.random', () => {
    const sample = () => everyFace(renderer, theme).map((draw) => hashOps(record(draw)));
    expect(withMathRandom(0.9, sample)).toEqual(withMathRandom(0.1, sample));
  });

  it('should leave the canvas state balanced after every face', () => {
    for (const draw of everyFace(renderer, theme)) {
      const ops = record(draw);
      expect(count(ops, 'save')).toBe(count(ops, 'restore'));
    }
  });

  it('should never draw a suit symbol as font text', () => {
    const symbols = Object.values(symbolsOf(theme));
    for (const suit of SUITS) {
      const drawn = texts(record(numberCard(renderer, theme, suit, 7)), ['fillText', 'strokeText']);
      expect(drawn.filter((text) => symbols.includes(text as string))).toEqual([]);
    }
  });

  it.skipIf(style === 'pixel')('should print the value and suit name and title the Wizard and Jester', () => {
    for (const suit of SUITS) {
      expect(texts(record(numberCard(renderer, theme, suit, 11)))).toEqual(expect.arrayContaining(['11', theme.suits[suit].name]));
    }
    expect(texts(record((ctx) => renderer.drawWizardCard(ctx, W, H)))).toContain('WIZARD');
    expect(texts(record((ctx) => renderer.drawJesterCard(ctx, W, H)))).toContain('JESTER');
  });

  it.skipIf(style === 'classic')('should draw number cards differently from classic', () => {
    const classic = getCardArtRenderer('classic');
    expect(hashOps(record(numberCard(renderer, theme, Suit.ELVES, 5)))).not.toBe(
      hashOps(record(numberCard(classic, theme, Suit.ELVES, 5)))
    );
  });

  it('should change the number face with the number size preset', () => {
    expect(hashOps(record(numberCard(renderer, theme, Suit.GIANTS, 5, 'small')))).not.toBe(
      hashOps(record(numberCard(renderer, theme, Suit.GIANTS, 5, 'large')))
    );
  });
});

describe('classic card art style', () => {
  it('should print the value three times (centre emblem and both corners)', () => {
    const classic = getCardArtRenderer('classic');
    for (const id of ['fantasy', 'elements']) {
      const theme = themeById(id);
      for (const suit of SUITS) {
        expect(texts(record(numberCard(classic, theme, suit, 7))).filter((text) => text === '7')).toHaveLength(3);
      }
    }
  });
});

describe('special card faces', () => {
  const PIXEL_ROWS = Math.round((PIXEL_GRID_COLS * H) / W);
  const PAINT_OPS = new Set(['fill', 'fillRect', 'fillText', 'stroke', 'strokeText']);

  function drawFaceOps(style: CardArtStyle, type: SpecialCardType): RecordedOp[] {
    return record(specialCard(getCardArtRenderer(style), type));
  }

  it('should take title, corner index and value from the card catalog', () => {
    expect(getSpecialCardFace(CardType.DRAGON)).toMatchObject({ title: 'DRAGON', cornerLabel: 'D', valueLabel: null });
    expect(getSpecialCardFace(CardType.JUGGLER).valueLabel).toBe('7½');
    expect(getSpecialCardFace(CardType.CLOUD).valueLabel).toBe('9¾');
    expect(splitValueLabel('9¾')).toEqual({ whole: '9', fraction: ['3', '4'] });
    expect(splitValueLabel('7')).toEqual({ whole: '7', fraction: null });
  });

  it('should make room for the value below the emblem on valued cards', () => {
    const center = { x: 256, y: 364 };
    const plain = layoutSpecialFace(center, 100, getSpecialCardFace(CardType.WITCH));
    const valued = layoutSpecialFace(center, 100, getSpecialCardFace(CardType.JUGGLER));
    expect(plain.value).toBeNull();
    expect(valued.emblem.size).toBeLessThan(plain.emblem.size);
    expect(valued.value!.y).toBeGreaterThan(valued.emblem.y + valued.emblem.size);
  });

  describe.each(ART_STYLES)('%s style', (style) => {
    it.each(SPECIAL_CARD_TYPES)('should paint a non-blank %s face', (type) => {
      expect(drawFaceOps(style, type).filter((op) => PAINT_OPS.has(op.name)).length).toBeGreaterThan(20);
    });

    it('should paint a distinct face for every special card, not only a different title', () => {
      const withoutText = (ops: RecordedOp[]) => ops.filter((op) => op.name !== 'fillText' && op.name !== 'strokeText');
      const hashes = SPECIAL_CARD_TYPES.map((type) => hashOps(withoutText(drawFaceOps(style, type))));
      expect(new Set(hashes).size).toBe(SPECIAL_CARD_TYPES.length);
    });
  });

  it.each(ART_STYLES.filter((style) => style !== 'pixel'))('should letter %s faces with title and corner index', (style) => {
    for (const type of SPECIAL_CARD_TYPES) {
      const face = getSpecialCardFace(type);
      const drawn = texts(drawFaceOps(style, type));
      expect(drawn).toContain(face.title);
      expect(drawn.filter((text) => text === face.cornerLabel).length).toBeGreaterThanOrEqual(2);
    }
    // Corners plus the large value on the face
    expect(texts(drawFaceOps(style, CardType.JUGGLER)).filter((text) => text === '7½').length).toBeGreaterThanOrEqual(3);
  });

  it('should keep pixel special faces on the low-res grid', () => {
    for (const type of SPECIAL_CARD_TYPES) {
      const ops = drawFaceOps('pixel', type);
      expect(ops).toContainEqual({ name: 'set:imageSmoothingEnabled', args: [false] });
      const offGrid = ops
        .filter((op) => op.name === 'fillRect')
        .map((op) => op.args as number[])
        .filter(([x, y, w, h]) => ![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || x + w > PIXEL_GRID_COLS || y + h > PIXEL_ROWS);
      expect(offGrid).toEqual([]);
    }
  });
});
