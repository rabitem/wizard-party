'use client';

import * as THREE from 'three';
import { ICard, CardType, Suit, isSpecialCardType } from '@shared/domain';
import type { SuitTheme } from '@/presentation/components/settings';
import { getSeasonalCardStyle, getCardBackDesign } from '@/presentation/components/settings/card-back-presets';
import { CARD_FACE_LOGICAL_SIZE, type CardTextureTier } from '@/presentation/config/card-render.config';
import { getActiveCardNumberFontSizes, getActiveCardTheme } from '../card-theme-store';
import { getCardArtRenderer } from './card-art-styles';
import { applyCardTextureQuality, getCardTextureTier, getCardTextureTierSpec } from './card-texture-quality';
import { drawSeasonalFrontOrnaments, type SeasonalOrnamentColors } from './seasonal-front-ornaments';

// ============== SETTINGS HELPERS ==============
// Theme and number size come from the card theme store, the same snapshot useCardThemeVersion
// reports, so a texture never shows a different theme than the version it was memoised on.

/** Get suit theme for a specific suit based on current card theme */
function getSuitTheme(suit: Suit): SuitTheme {
  return getActiveCardTheme().suits[suit];
}

/** Get all suit symbols for current theme (keys of the vector suit glyphs) */
function getCurrentSuitSymbols(): Record<Suit, string> {
  const theme = getActiveCardTheme();
  return {
    [Suit.GIANTS]: theme.suits.GIANTS.canvasSymbol,
    [Suit.ELVES]: theme.suits.ELVES.canvasSymbol,
    [Suit.DWARVES]: theme.suits.DWARVES.canvasSymbol,
    [Suit.HUMANS]: theme.suits.HUMANS.canvasSymbol,
  };
}

/**
 * Seasonal decks get themed corner and frame flourishes on top of the classic face.
 * Number cards use their suit colours; Wizard, Jester and special cards use the deck's back palette.
 */
function decorateSeasonalFront(ctx: CanvasRenderingContext2D, w: number, h: number, themeId: string, card: ICard): void {
  const season = getSeasonalCardStyle(themeId);
  if (!season) return;
  let colors: SeasonalOrnamentColors;
  if (card.type === CardType.NUMBER && card.suit) {
    const suit = getSuitTheme(card.suit);
    colors = { main: suit.gold, accent: suit.accent, shade: suit.primary };
  } else {
    const { palette } = getCardBackDesign(themeId);
    colors = { main: palette.metal, accent: palette.accent, shade: palette.ink };
  }
  drawSeasonalFrontOrnaments(ctx, w, h, season, colors);
}

/** Paints a card face of the active card theme in logical coordinates (w x h) */
function paintCardFace(ctx: CanvasRenderingContext2D, card: ICard, w: number, h: number): void {
  const cardTheme = getActiveCardTheme();
  const artStyle = cardTheme.artStyle ?? 'classic';
  const renderer = getCardArtRenderer(artStyle);
  if (card.type === CardType.WIZARD) {
    renderer.drawWizardCard(ctx, w, h);
  } else if (card.type === CardType.JESTER) {
    renderer.drawJesterCard(ctx, w, h);
  } else if (isSpecialCardType(card.type)) {
    renderer.drawSpecialCard(ctx, w, h, card.type);
  } else if (card.suit && card.value != null) {
    const theme = getSuitTheme(card.suit);
    const fontSizes = getActiveCardNumberFontSizes();
    const suitSymbols = getCurrentSuitSymbols();
    renderer.drawNumberCard({ ctx, w, h, suit: card.suit, value: card.value, theme, fontSizes, suitSymbols });
  }
  if (artStyle === 'classic') decorateSeasonalFront(ctx, w, h, cardTheme.id, card);
}

/**
 * Paints a new face texture. The art is drawn in the logical 512x768 space and rasterised at
 * the memory tier's resolution. Prefer the shared face cache (card-materials.ts): this always
 * repaints and uploads.
 */
export function createCardTexture(card: ICard, tier: CardTextureTier = getCardTextureTier()): THREE.CanvasTexture {
  const { width, height } = getCardTextureTierSpec(tier);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { WIDTH, HEIGHT } = CARD_FACE_LOGICAL_SIZE;
    if (width !== WIDTH || height !== HEIGHT) ctx.scale(width / WIDTH, height / HEIGHT);
    paintCardFace(ctx, card, WIDTH, HEIGHT);
  }
  const texture = new THREE.CanvasTexture(canvas);
  applyCardTextureQuality(texture);
  return texture;
}
