'use client';

/**
 * Hyperreal card art style: as photographic as procedural canvas allows.
 * Linen paper grain, a subtle vignette, an embossed metal frame lit from
 * the top-left, gold-foil symbols and numbers with specular sheen, and soft
 * drop shadows for depth.
 *
 * Colour roles for number cards: primary/secondary = card stock,
 * accent = suit name ink, gold = foil metal.
 */

import type { SpecialCardType } from '@shared/domain';
import { createSeededRandom, drawPentagram, drawSuitPattern, type RandomSource } from '../drawing-utils';
import { drawJesterHat } from '../jester-card-drawing';
import { createNumberCardPatternSeed, type DrawNumberCardParams } from '../numbered-card-drawing';
import { drawSpecialCardEmblem, getSpecialCardFace, layoutSpecialFace } from '../special-cards';
import {
  createFoilGradient,
  diagonalAxis,
  drawBevelFrame,
  drawEngravedText,
  drawFoilText,
  drawMedallion,
  drawPaperGrain,
  drawVignette,
} from './hyperreal-primitives';
import {
  blendHex,
  drawMirroredCorners,
  fitFontSize,
  getCornerLayout,
  mixColor,
  resetShadow,
  starPath,
  type CardSize,
} from './style-shared';

const SERIF = 'Georgia, "Times New Roman", serif';

const HYPERREAL_WIZARD = { base: '#2a1645', light: '#4a2a78', metal: '#d4af37' };
const HYPERREAL_JESTER = { base: '#e9dfc8', light: '#f8f2e4', metal: '#c9a23f', ink: '#7a1420', foil: '#b3202f' };
const HYPERREAL_SPECIAL = {
  EMBLEM_RADIUS: 112,
  OUTLINE: 2,
  /** Medallion radius relative to the emblem */
  MEDALLION_SCALE: 1.18,
  /** How much lighter the top-left of the card stock is */
  STOCK_LIGHT: 0.2,
  VIGNETTE: 0.5,
  TITLE_MAX_WIDTH: 380,
  CORNER_MAX_WIDTH: 90,
} as const;
const TITLE_SIZE = 44;
const CORNER_SIZE = 80;

/** Card stock: diagonal light falloff, grain and vignette */
interface CardStock {
  base: string;
  light: string;
  /** Darkness of the vignette at the card edges (0..1) */
  vignette: number;
}

function drawCardStock(ctx: CanvasRenderingContext2D, { w, h }: CardSize, stock: CardStock, random: RandomSource): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, stock.light);
  grad.addColorStop(0.55, stock.base);
  grad.addColorStop(1, mixColor(stock.base, 'black', 0.2));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  drawPaperGrain(ctx, w, h, random);
  drawVignette(ctx, w, h, stock.vignette);
}

/** Large foil corner letter (W / J / special card index) */
function drawFoilCornerLetter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  letter: string,
  metal: string,
  size: number = CORNER_SIZE
): void {
  drawMirroredCorners(ctx, { w, h }, { x: 85, y: 90 }, () => {
    drawFoilText(ctx, letter, 0, 0, { font: `bold ${size}px ${SERIF}`, metal, size });
  });
}

export function drawHyperrealNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(`hyperreal|${createNumberCardPatternSeed(suit, value, theme)}`);
  const metal = theme.gold;
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawCardStock(ctx, { w, h }, { base: theme.primary, light: theme.secondary, vignette: 0.5 }, random);

  // Blind-embossed watermark of the suit pattern
  ctx.globalAlpha = 0.07;
  drawSuitPattern(ctx, { w, h }, theme.pattern, theme.accent, random);
  ctx.globalAlpha = 1;

  drawBevelFrame(ctx, w, h, metal);
  drawMedallion(ctx, { x: cx, y: cy, r: 112 }, theme.secondary, metal);
  drawFoilText(ctx, theme.canvasSymbol, cx, cy, {
    font: `${fontSizes.center}px Arial`,
    metal,
    size: fontSizes.center,
  });
  drawEngravedText(ctx, theme.name, { x: cx, y: h - 100 }, `bold 36px ${SERIF}`, theme.accent);

  const layout = getCornerLayout(value, fontSizes);
  drawMirroredCorners(ctx, { w, h }, layout, () => {
    drawMedallion(ctx, { x: 0, y: 0, r: layout.radius }, theme.primary, metal);
    drawFoilText(ctx, String(value), 0, fontSizes.corner * 0.05, {
      font: `bold ${fontSizes.corner}px ${SERIF}`,
      metal,
      size: fontSizes.corner,
    });
    drawFoilText(ctx, suitSymbols[suit], 0, layout.radius + fontSizes.cornerSymbol * 0.75, {
      font: `${fontSizes.cornerSymbol}px Arial`,
      metal,
      size: fontSizes.cornerSymbol,
    });
  });
}

export function drawHyperrealWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('hyperreal|wizard')
): void {
  const { metal } = HYPERREAL_WIZARD;
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawCardStock(ctx, { w, h }, { base: HYPERREAL_WIZARD.base, light: HYPERREAL_WIZARD.light, vignette: 0.6 }, random);

  // Faint glints in the velvet
  ctx.fillStyle = 'rgba(255,236,170,0.5)';
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const x = 50 + random() * (w - 100);
    const y = 50 + random() * (h - 100);
    const r = 0.6 + random() * 1.6;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();

  drawBevelFrame(ctx, w, h, metal);
  drawMedallion(ctx, { x: cx, y: cy, r: 120 }, '#2d1b4e', metal);

  // Engraved foil pentagram
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 3;
  ctx.strokeStyle = createFoilGradient(ctx, diagonalAxis(cx, cy, 80), metal);
  drawPentagram(ctx, cx, cy, 78);

  // Raised foil star with drop shadow and specular highlight
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  starPath(ctx, { x: cx, y: cy, outer: 44, inner: 18, points: 5 });
  ctx.fillStyle = createFoilGradient(ctx, diagonalAxis(cx, cy, 44), metal);
  ctx.fill();
  ctx.restore();
  resetShadow(ctx);
  starPath(ctx, { x: cx - 4, y: cy - 5, outer: 22, inner: 9, points: 5 });
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  drawFoilText(ctx, 'WIZARD', w / 2, h - 100, { font: `bold 44px ${SERIF}`, metal, size: 44 });
  drawFoilCornerLetter(ctx, w, h, 'W', metal);
}

export function drawHyperrealJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('hyperreal|jester')
): void {
  const { metal, ink } = HYPERREAL_JESTER;
  const cx = w / 2;
  const cy = h / 2 - 30;

  drawCardStock(ctx, { w, h }, { base: HYPERREAL_JESTER.base, light: HYPERREAL_JESTER.light, vignette: 0.35 }, random);
  drawBevelFrame(ctx, w, h, metal);

  // Hat and face lifted off the paper by one soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(40,20,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 7;
  drawJesterHat(ctx, cx, cy);
  const face = ctx.createRadialGradient(cx - 22, cy, 6, cx, cy + 20, 62);
  face.addColorStop(0, '#fffaf0');
  face.addColorStop(1, '#e8d6b0');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy + 20, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  resetShadow(ctx);

  // Features
  ctx.fillStyle = '#1b1b1b';
  for (const ex of [cx - 20, cx + 20]) {
    ctx.beginPath();
    ctx.arc(ex, cy + 10, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 25, 30, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const nose = ctx.createRadialGradient(cx - 3, cy + 21, 1, cx, cy + 25, 11);
  nose.addColorStop(0, '#ff7b7b');
  nose.addColorStop(1, '#a3121f');
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.arc(cx, cy + 25, 10, 0, Math.PI * 2);
  ctx.fill();

  // Red foil reads better than gold on the light paper
  drawFoilText(ctx, 'JESTER', w / 2, h - 100, { font: `bold 44px ${SERIF}`, metal: HYPERREAL_JESTER.foil, size: 44 });
  drawFoilCornerLetter(ctx, w, h, 'J', HYPERREAL_JESTER.foil);
}

/** Special card: its own card stock and metal, the emblem raised off a domed medallion */
export function drawHyperrealSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`hyperreal|${type}`)
): void {
  const face = getSpecialCardFace(type);
  const { palette } = face;
  const { metal } = palette;
  const light = blendHex(palette.field, '#ffffff', HYPERREAL_SPECIAL.STOCK_LIGHT);
  drawCardStock(ctx, { w, h }, { base: palette.field, light, vignette: HYPERREAL_SPECIAL.VIGNETTE }, random);
  drawBevelFrame(ctx, w, h, metal);

  const { emblem, value } = layoutSpecialFace({ x: w / 2, y: h / 2 - 20 }, HYPERREAL_SPECIAL.EMBLEM_RADIUS, face);
  const medallion = { x: emblem.x, y: emblem.y, r: emblem.size * HYPERREAL_SPECIAL.MEDALLION_SCALE };
  drawMedallion(ctx, medallion, palette.fieldEdge, metal);

  // The art casts one soft shadow onto the medallion
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: HYPERREAL_SPECIAL.OUTLINE });
  ctx.restore();
  resetShadow(ctx);

  if (value && face.valueLabel) {
    drawFoilText(ctx, face.valueLabel, value.x, value.y, { font: `bold ${value.fontSize}px ${SERIF}`, metal, size: value.fontSize });
  }
  const serif = (px: number) => `bold ${px}px ${SERIF}`;
  const titleSize = fitFontSize(ctx, face.title, serif, TITLE_SIZE, HYPERREAL_SPECIAL.TITLE_MAX_WIDTH);
  drawFoilText(ctx, face.title, w / 2, h - 100, { font: serif(titleSize), metal, size: titleSize });
  const cornerSize = fitFontSize(ctx, face.cornerLabel, serif, CORNER_SIZE, HYPERREAL_SPECIAL.CORNER_MAX_WIDTH);
  drawFoilCornerLetter(ctx, w, h, face.cornerLabel, metal, cornerSize);
}
