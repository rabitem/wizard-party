'use client';

import { Suit } from '@shared/domain';
import type { SuitTheme } from '@/presentation/components/settings';
import {
  drawOrnateFrame,
  drawMountainPattern,
  drawStarPattern,
  drawForgePattern,
  drawCastlePattern,
  createSeededRandom,
  type RandomSource,
} from './drawing-utils';
import { fillSymbolText } from './suit-glyphs';
import { getCornerLayout, type CornerLayout } from './styles/style-shared';

/** Centre emblem circle of the classic number card (logical px) */
const EMBLEM_RADIUS = 110;

/** Corner value size of two-digit values, relative to fontSizes.corner */
const CORNER_TWO_DIGIT_SCALE = 0.86;

/** Suit name under the emblem; it stays clear of the bottom-right corner badge */
const SUIT_NAME = { FONT: 'bold 36px Georgia, serif', BOTTOM_OFFSET: 100, BADGE_GAP: 10 } as const;

/** Large value in the centre emblem, suit glyph underneath */
const CENTER_VALUE = {
  /** Two digits must fit the emblem's inner ring */
  TWO_DIGIT_SCALE: 0.82,
  /** Georgia numerals sit a little high with baseline 'middle' */
  BASELINE_NUDGE: 0.05,
  /** Suit glyph under the emblem, relative to fontSizes.centerSymbol */
  SUIT_GLYPH_SCALE: 1.45,
  SUIT_GLYPH_GAP: 14,
} as const;

/** Font size configuration for card numbers */
export interface CardNumberFontSizes {
  center: number;
  centerSymbol: number;
  corner: number;
  cornerSymbol: number;
}

export interface DrawNumberCardParams {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  suit: Suit;
  value: number;
  theme: SuitTheme;
  fontSizes: CardNumberFontSizes;
  suitSymbols: Record<Suit, string>;
  random?: RandomSource;
}

export function createNumberCardPatternSeed(suit: Suit, value: number, theme: SuitTheme): string {
  return [
    suit,
    value,
    theme.name,
    theme.pattern,
    theme.primary,
    theme.secondary,
    theme.accent,
    theme.gold,
    theme.canvasSymbol,
  ].join('|');
}

/**
 * Draws a numbered suit card (values 1-13).
 * Each suit has a unique theme with colors and background pattern.
 */
export function drawNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(createNumberCardPatternSeed(suit, value, theme));
  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, theme.primary);
  bgGrad.addColorStop(0.5, theme.secondary);
  bgGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Pattern based on suit
  ctx.globalAlpha = 0.15;
  if (theme.pattern === 'mountains') {
    drawMountainPattern(ctx, w, h, theme.accent, random);
  } else if (theme.pattern === 'stars') {
    drawStarPattern(ctx, w, h, theme.accent, random);
  } else if (theme.pattern === 'forge') {
    drawForgePattern(ctx, w, h, theme.accent, random);
  } else if (theme.pattern === 'castle') {
    drawCastlePattern(ctx, w, h, theme.accent);
  }
  ctx.globalAlpha = 1;

  // Ornate frame
  drawOrnateFrame(ctx, w, h, theme.gold, theme.accent);

  // Center emblem area
  const cx = w / 2;
  const cy = h / 2 - 20;

  // Emblem background circle
  const emblemGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, EMBLEM_RADIUS);
  emblemGrad.addColorStop(0, theme.secondary);
  emblemGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = emblemGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, EMBLEM_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Emblem border
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, EMBLEM_RADIUS - 12, 0, Math.PI * 2);
  ctx.stroke();

  // Value in the emblem: the number is what a player reads from across the table, so it is
  // the largest element of the face. The suit is the vector glyph below it and the colours.
  const centerValueSize = value >= 10 ? fontSizes.center * CENTER_VALUE.TWO_DIGIT_SCALE : fontSizes.center;
  ctx.fillStyle = theme.gold;
  ctx.font = `bold ${centerValueSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(String(value), cx, cy + centerValueSize * CENTER_VALUE.BASELINE_NUDGE);

  const glyphSize = fontSizes.centerSymbol * CENTER_VALUE.SUIT_GLYPH_SCALE;
  ctx.font = `${glyphSize}px Arial`;
  fillSymbolText(ctx, suitSymbols[suit], cx, cy + EMBLEM_RADIUS + CENTER_VALUE.SUIT_GLYPH_GAP + glyphSize / 2);
  ctx.shadowBlur = 0;

  const corner = getCornerLayout(value, fontSizes);
  // Suit name below the emblem, condensed if it would reach the bottom-right corner badge
  // (long names such as DIAMONDS meet it at the larger corner sizes)
  ctx.fillStyle = theme.accent;
  ctx.font = SUIT_NAME.FONT;
  const nameMaxWidth = 2 * (w / 2 - corner.x - corner.radius - SUIT_NAME.BADGE_GAP);
  ctx.fillText(theme.name, cx, h - SUIT_NAME.BOTTOM_OFFSET, nameMaxWidth);

  drawCornerIndex(ctx, { w, h, value, theme, fontSizes, symbol: suitSymbols[suit], corner });
}

interface CornerIndexParams {
  w: number;
  h: number;
  value: number;
  theme: SuitTheme;
  fontSizes: CardNumberFontSizes;
  symbol: string;
  corner: CornerLayout;
}

/** Value badge plus suit glyph, drawn top-left and again rotated 180 degrees bottom-right */
function drawCornerIndex(ctx: CanvasRenderingContext2D, params: CornerIndexParams): void {
  const { w, h, value, theme, fontSizes, symbol, corner } = params;
  const { radius: circleRadius, x: cornerX, y: cornerY } = corner;
  // Two digits stay inside the badge
  const valueSize = value >= 10 ? fontSizes.corner * CORNER_TWO_DIGIT_SCALE : fontSizes.corner;

  const drawIndex = () => {
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.gold;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = theme.gold;
    ctx.font = `bold ${valueSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Offset to visually center (font metrics don't align perfectly)
    ctx.fillText(String(value), 0, valueSize * 0.05);

    ctx.font = `${fontSizes.cornerSymbol}px Arial`;
    fillSymbolText(ctx, symbol, 0, circleRadius + fontSizes.cornerSymbol * 0.7);
  };

  ctx.save();
  ctx.translate(cornerX, cornerY);
  drawIndex();
  ctx.restore();

  ctx.save();
  ctx.translate(w - cornerX, h - cornerY);
  ctx.rotate(Math.PI);
  drawIndex();
  ctx.restore();
}
