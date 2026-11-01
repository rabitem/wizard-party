import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardType, Suit, type ICard } from '@shared/domain';
import { getSeasonalCardStyle } from '@/presentation/components/settings/card-back-presets';
import { CARD_THEMES, type CardTheme } from '@/presentation/components/settings/card-theme-presets';
import { CARD_NUMBER_SIZE_PRESETS } from '@/presentation/components/settings/visual-presets';
import { getCardArtRenderer } from './card-textures/card-art-styles';
// Warm the module graph at collection time: every test re-imports it after vi.resetModules().
import './card-textures/card-face-texture';
import { createRecordingContext, hashOps, type RecordedOp } from './card-textures/recording-context.test-helper';

const settings = vi.hoisted(() => ({ cardTheme: 'fantasy', cardNumberSize: 'medium' }));

vi.mock('@/presentation/components/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/presentation/components/settings')>();
  return { ...actual, loadGameSettings: () => ({ ...settings }) };
});

type FaceTextures = typeof import('./card-textures/card-face-texture');

const NUMBER_CARD: ICard = { id: 'DWARVES-4', type: CardType.NUMBER, suit: Suit.DWARVES, value: 4 };
const WIZARD_CARD: ICard = { id: 'wizard-1', type: CardType.WIZARD, suit: null, value: null };
const DRAGON_CARD: ICard = { id: 'DRAGON-0', type: CardType.DRAGON, suit: null, value: null };
const W = 512;
const H = 768;

const MEDIUM_FONT_SIZES = (() => {
  const preset = CARD_NUMBER_SIZE_PRESETS.find((p) => p.id === 'medium');
  if (!preset) throw new Error('Missing medium number size preset');
  return preset.fontSizes;
})();

/** Every canvas created (face textures, low-res pixel surfaces) records into the returned list, in order */
function installCanvas(): RecordedOp[][] {
  const canvases: RecordedOp[][] = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const { ctx, ops } = createRecordingContext();
      canvases.push(ops);
      return { width: 0, height: 0, getContext: () => ctx };
    },
  });
  return canvases;
}

/** A fresh page with the deck selected the way saving the settings does (save, then settings-changed) */
async function loadPageWithDeck(themeId: string): Promise<FaceTextures> {
  vi.stubGlobal('window', new EventTarget());
  vi.resetModules();
  const faces = await import('./card-textures/card-face-texture');
  settings.cardTheme = themeId;
  window.dispatchEvent(new Event('settings-changed'));
  return faces;
}

/** What the deck's art style paints for the card when called directly with the deck's suits */
function directOps(theme: CardTheme, card: ICard): RecordedOp[] {
  const renderer = getCardArtRenderer(theme.artStyle);
  const { ctx, ops } = createRecordingContext();
  if (card.type === CardType.WIZARD) renderer.drawWizardCard(ctx, W, H);
  else if (card.type === CardType.DRAGON) renderer.drawSpecialCard(ctx, W, H, CardType.DRAGON);
  else if (card.suit && card.value !== null) {
    renderer.drawNumberCard({
      ctx,
      w: W,
      h: H,
      suit: card.suit,
      value: card.value,
      theme: theme.suits[card.suit],
      fontSizes: MEDIUM_FONT_SIZES,
      suitSymbols: {
        [Suit.GIANTS]: theme.suits.GIANTS.canvasSymbol,
        [Suit.ELVES]: theme.suits.ELVES.canvasSymbol,
        [Suit.DWARVES]: theme.suits.DWARVES.canvasSymbol,
        [Suit.HUMANS]: theme.suits.HUMANS.canvasSymbol,
      },
    });
  }
  return ops;
}

afterEach(() => {
  vi.unstubAllGlobals();
  settings.cardTheme = 'fantasy';
});

describe('createCardTexture paints every deck with its art style', () => {
  it.each(CARD_THEMES)(
    'should paint the $id deck in its art style, with seasonal flourishes only on classic seasonal decks',
    async (theme) => {
      const canvases = installCanvas();
      const faces = await loadPageWithDeck(theme.id);
      // Seasonal decks draw their flourishes on top of the classic face
      const ornamented = (theme.artStyle ?? 'classic') === 'classic' && getSeasonalCardStyle(theme.id) !== null;

      for (const card of [NUMBER_CARD, WIZARD_CARD, DRAGON_CARD]) {
        const created = canvases.length;
        faces.createCardTexture(card, 'standard').dispose();
        // The face canvas comes first (the pixel style paints on a second, low-res canvas)
        const painted = canvases[created];
        const expected = directOps(theme, card);

        expect(hashOps(painted.slice(0, expected.length)), card.id).toBe(hashOps(expected));
        if (ornamented) expect(painted.length, card.id).toBeGreaterThan(expected.length);
        else expect(painted.length, card.id).toBe(expected.length);
      }
    }
  );
});
