'use client';

import { CardType, SPECIAL_CARD_TYPES, Suit, getCardCatalogEntry, isSpecialCardType } from '@shared/domain';
import { CARD_NUMBER_SIZE_PRESETS, type CardTheme } from '@/presentation/components/settings';
import { getCardArtRenderer } from '@/presentation/utils/card-texture';

/** Same canvas size the in-game card textures use. */
const CARD_CANVAS_WIDTH = 512;
const CARD_CANVAS_HEIGHT = 768;
const DEFAULT_CARD_NUMBER_SIZE = 'medium';

export const GALLERY_SUITS: Suit[] = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];
export const GALLERY_VALUES = [1, 7, 13] as const;

export interface GalleryCardSpec {
  key: string;
  label: string;
  type: CardType;
  suit?: Suit;
  value?: number;
}

export function getGalleryCardSpecs(): GalleryCardSpec[] {
  const numbered = GALLERY_SUITS.flatMap((suit) =>
    GALLERY_VALUES.map((value) => ({ key: `${suit}-${value}`, label: `${suit} ${value}`, type: CardType.NUMBER, suit, value })),
  );
  const specials = SPECIAL_CARD_TYPES.map((type) => ({
    key: type.toLowerCase(),
    label: getCardCatalogEntry(type).name,
    type,
  }));
  return [
    ...numbered,
    { key: 'wizard', label: 'Wizard', type: CardType.WIZARD },
    { key: 'jester', label: 'Jester', type: CardType.JESTER },
    ...specials,
  ];
}

function getDefaultFontSizes() {
  const preset = CARD_NUMBER_SIZE_PRESETS.find((p) => p.id === DEFAULT_CARD_NUMBER_SIZE);
  return (preset ?? CARD_NUMBER_SIZE_PRESETS[1]).fontSizes;
}

/** Draws one card face onto the given canvas with the real in-game texture code and art style. */
export function drawCardFace(canvas: HTMLCanvasElement, theme: CardTheme, spec: GalleryCardSpec): void {
  canvas.width = CARD_CANVAS_WIDTH;
  canvas.height = CARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  // Use the deck's own art style (classic, manga, hyperreal), same as the game.
  const { drawJesterCard, drawNumberCard, drawSpecialCard, drawWizardCard } = getCardArtRenderer(theme.artStyle);
  if (spec.type === CardType.WIZARD) {
    drawWizardCard(ctx, w, h);
  } else if (spec.type === CardType.JESTER) {
    drawJesterCard(ctx, w, h);
  } else if (isSpecialCardType(spec.type)) {
    drawSpecialCard(ctx, w, h, spec.type);
  } else if (spec.suit && spec.value != null) {
    const suitSymbols = Object.fromEntries(
      GALLERY_SUITS.map((suit) => [suit, theme.suits[suit].canvasSymbol]),
    ) as Record<Suit, string>;
    drawNumberCard({
      ctx, w, h, suit: spec.suit, value: spec.value,
      theme: theme.suits[spec.suit], fontSizes: getDefaultFontSizes(), suitSymbols,
    });
  }
}
