'use client';

/**
 * Solarpunk card art style: botanical line art on sun-bleached paper, a fine
 * double ink frame with riveted brass corners, and leaf-vein suit emblems in
 * a brass medallion (oak, fern, ginkgo sun, bloom).
 *
 * Colour roles for number cards (trend-card-themes.ts): primary = paper,
 * secondary = paper tint, accent = botanical ink, gold = brass.
 */

import type { SpecialCardType } from '@shared/domain';
import { createSeededRandom, type RandomSource } from '../drawing-utils';
import { createNumberCardPatternSeed, type DrawNumberCardParams } from '../numbered-card-drawing';
import { drawSpecialCardEmblem, getSpecialCardFace, layoutSpecialFace, mapEmblemPalette } from '../special-cards';
import { drawSolarpunkEmblem } from './solarpunk-emblems';
import {
  SOLARPUNK_SERIF,
  SOLARPUNK_TITLE_FONT_SIZE,
  brassGradient,
  drawBotanicalPaper,
  drawBrassCorners,
  drawBrassMedallion,
  drawCornerBadge,
  drawInkFrame,
  drawTitlePlaque,
  drawVeinedLeaf,
  type SolarpunkColors,
} from './solarpunk-primitives';
import {
  blendHex,
  drawMirroredCorners,
  fitFontSize,
  getCornerLayout,
  mixColor,
  starPath,
  withAlpha,
  type CardSize,
  type Point,
} from './style-shared';
import { fillSymbolText } from '../suit-glyphs';

const SOLARPUNK_WIZARD_COLORS: SolarpunkColors = { paper: '#f4f1e4', tint: '#dcebcf', ink: '#24683a', brass: '#b8913a' };
const SOLARPUNK_JESTER_COLORS: SolarpunkColors = { paper: '#f7f1e0', tint: '#efe0bc', ink: '#2f6a2a', brass: '#c08a2a' };
const MEDALLION_RADIUS = 120;
/** fontSizes.center the emblem is designed for (medium preset) */
const EMBLEM_DESIGN_SIZE = 160;
const EMBLEM_BASE_SCALE = 0.85;
const SUN_RAYS = 24;
/** Wider plaque for WIZARD / JESTER; their corner badges are smaller */
const SPECIAL_PLAQUE_WIDTH = 206;
const CORNER_FONT_SIZE = 52;
const CORNER_BADGE_RADIUS = 40;
const SOLARPUNK_SPECIAL = {
  PAPER: '#f4f1e4',
  BRASS: '#b8913a',
  /** Paper tint and botanical ink derived from the card's signature colour */
  TINT_FADE: 0.78,
  INK_SHADE: 0.5,
  /** Emblem line art is a little darker than the frame ink */
  LINE_SHADE: 0.35,
  /** Emblem colours washed towards the paper, like watercolour under ink line art */
  WASH: 0.22,
  EMBLEM_RADIUS: 106,
  OUTLINE: 2.2,
  MEDALLION_SCALE: 1.1,
  SUNBURST_INNER: 1.1,
  SUNBURST_OUTER: 1.75,
  /** Text room inside the plaque and the corner badge */
  TITLE_MAX_WIDTH: SPECIAL_PLAQUE_WIDTH - 36,
  CORNER_MAX_WIDTH: 62,
} as const;

/** Paper, frame and brass corners shared by every card */
function drawSolarpunkBase(ctx: CanvasRenderingContext2D, size: CardSize, colors: SolarpunkColors, random: RandomSource): void {
  drawBotanicalPaper(ctx, size, colors, random);
  drawInkFrame(ctx, size, colors);
  drawBrassCorners(ctx, size, colors);
}

export function drawSolarpunkNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(`solarpunk|${createNumberCardPatternSeed(suit, value, theme)}`);
  const colors: SolarpunkColors = { paper: theme.primary, tint: theme.secondary, ink: theme.accent, brass: theme.gold };
  const center = { x: w / 2, y: h / 2 - 20 };

  drawSolarpunkBase(ctx, { w, h }, colors, random);
  drawBrassMedallion(ctx, center, MEDALLION_RADIUS, colors);
  const scale = (fontSizes.center / EMBLEM_DESIGN_SIZE) * EMBLEM_BASE_SCALE;
  drawSolarpunkEmblem(ctx, suit, center, scale, { ink: colors.ink, brass: colors.brass });
  drawTitlePlaque(ctx, { x: w / 2, y: h - 100 }, theme.name, colors);

  const layout = getCornerLayout(value, fontSizes);
  const numberSize = Math.round(fontSizes.corner * (value >= 10 ? 0.78 : 0.92));
  drawMirroredCorners(ctx, { w, h }, layout, () => {
    drawCornerBadge(ctx, layout.radius, colors);
    ctx.fillStyle = mixColor(colors.ink, 'black', 0.25);
    ctx.font = `bold ${numberSize}px ${SOLARPUNK_SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 0, numberSize * 0.05);
    ctx.fillStyle = colors.ink;
    ctx.font = `${fontSizes.cornerSymbol}px Arial`;
    fillSymbolText(ctx, suitSymbols[suit], 0, layout.radius + fontSizes.cornerSymbol * 0.7);
  });
}

/** Big serif corner letter (W / J / special card index) in a brass badge */
function drawCornerLetter(
  ctx: CanvasRenderingContext2D,
  size: CardSize,
  letter: string,
  colors: SolarpunkColors,
  fontSize: number = CORNER_FONT_SIZE
): void {
  drawMirroredCorners(ctx, size, { x: 82, y: 86 }, () => {
    drawCornerBadge(ctx, CORNER_BADGE_RADIUS, colors);
    ctx.fillStyle = mixColor(colors.ink, 'black', 0.25);
    ctx.font = `bold ${fontSize}px ${SOLARPUNK_SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 0, 3);
  });
}

/** Brass sunburst with alternating long and short rays behind the art */
function drawSunburst(ctx: CanvasRenderingContext2D, center: Point, inner: number, outer: number, colors: SolarpunkColors): void {
  ctx.beginPath();
  for (let i = 0; i < SUN_RAYS; i++) {
    const a = (i / SUN_RAYS) * Math.PI * 2;
    const tip = i % 2 === 0 ? outer : outer * 0.78;
    const half = Math.PI / SUN_RAYS;
    ctx.moveTo(center.x + Math.cos(a - half) * inner, center.y + Math.sin(a - half) * inner);
    ctx.lineTo(center.x + Math.cos(a) * tip, center.y + Math.sin(a) * tip);
    ctx.lineTo(center.x + Math.cos(a + half) * inner, center.y + Math.sin(a + half) * inner);
  }
  ctx.fillStyle = withAlpha(colors.brass, 0.35);
  ctx.fill();
  ctx.strokeStyle = colors.brass;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Leaf-woven wizard hat with a brass band and a sun-star at the tip */
function drawLeafHat(ctx: CanvasRenderingContext2D, center: Point, colors: SolarpunkColors): void {
  const { x, y } = center;
  const tip = { x: x + 34, y: y - 150 };
  const brimY = y + 70;
  ctx.beginPath();
  ctx.moveTo(x - 78, brimY);
  ctx.quadraticCurveTo(x - 30, y - 30, tip.x, tip.y);
  ctx.quadraticCurveTo(x + 30, y - 10, x + 78, brimY);
  ctx.closePath();
  const fill = ctx.createLinearGradient(x - 80, 0, x + 80, 0);
  fill.addColorStop(0, mixColor(colors.ink, 'white', 0.25));
  fill.addColorStop(1, mixColor(colors.ink, 'black', 0.2));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = mixColor(colors.ink, 'black', 0.45);
  ctx.lineWidth = 3;
  ctx.stroke();

  // A vine spiralling up the hat
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const px = x - 50 + t * 90 + Math.sin(t * 9) * 14;
    const py = brimY - 10 - t * 190;
    drawVeinedLeaf(ctx, { x: px, y: py }, { length: 30, width: 11, angle: -0.6 + (i % 2) * -1.9 }, { fill: withAlpha(colors.paper, 0.5), ink: colors.paper }, 1.4);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(x, brimY, 118, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = mixColor(colors.ink, 'black', 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = brassGradient(ctx, brimY - 22, brimY - 4, colors.brass);
  ctx.fillRect(x - 70, brimY - 22, 140, 16);

  starPath(ctx, { x: tip.x, y: tip.y, outer: 24, inner: 10, points: 8 });
  ctx.fillStyle = colors.brass;
  ctx.fill();
  ctx.strokeStyle = mixColor(colors.brass, 'black', 0.45);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawSolarpunkWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('solarpunk|wizard')
): void {
  const colors = SOLARPUNK_WIZARD_COLORS;
  const center = { x: w / 2, y: h / 2 - 20 };
  drawSolarpunkBase(ctx, { w, h }, colors, random);
  drawSunburst(ctx, center, 120, 200, colors);
  drawBrassMedallion(ctx, center, MEDALLION_RADIUS, colors);
  drawLeafHat(ctx, { x: center.x, y: center.y + 10 }, colors);
  drawTitlePlaque(ctx, { x: w / 2, y: h - 100 }, 'WIZARD', colors, SPECIAL_PLAQUE_WIDTH);
  drawCornerLetter(ctx, { w, h }, 'W', colors);
}

/** Sunflower face wearing a three-leaf jester cap with brass bells */
function drawSunflowerJester(ctx: CanvasRenderingContext2D, center: Point, colors: SolarpunkColors): void {
  const { x, y } = center;
  const petals = 16;
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    drawVeinedLeaf(ctx, { x, y: y + 20 }, { length: 92, width: 20, angle }, { fill: '#ffd34a', ink: mixColor(colors.brass, 'black', 0.35) }, 1.8);
  }
  ctx.beginPath();
  ctx.arc(x, y + 20, 56, 0, Math.PI * 2);
  ctx.fillStyle = '#7a4a1e';
  ctx.fill();
  ctx.strokeStyle = mixColor(colors.ink, 'black', 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Closed happy eyes and a wide grin
  ctx.strokeStyle = '#fff2c8';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const ex of [x - 20, x + 20]) {
    ctx.beginPath();
    ctx.arc(ex, y + 12, 9, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y + 26, 26, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // Three drooping leaf points with bells
  const tips: Array<[number, number]> = [[x - 104, y - 40], [x, y - 140], [x + 104, y - 40]];
  tips.forEach(([tx, ty], i) => {
    const angle = Math.atan2(ty - (y - 30), tx - x);
    const base = { x: x + Math.cos(angle) * 22, y: y - 30 + Math.sin(angle) * 10 };
    const length = Math.hypot(tx - base.x, ty - base.y);
    drawVeinedLeaf(ctx, base, { length, width: 34, angle }, { fill: i === 1 ? colors.ink : mixColor(colors.ink, 'white', 0.3), ink: mixColor(colors.ink, 'black', 0.45) }, 2.4);
    ctx.beginPath();
    ctx.arc(tx, ty, 11, 0, Math.PI * 2);
    ctx.fillStyle = brassGradient(ctx, ty - 11, ty + 11, colors.brass);
    ctx.fill();
    ctx.strokeStyle = mixColor(colors.brass, 'black', 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });
  ctx.lineCap = 'butt';
}

export function drawSolarpunkJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('solarpunk|jester')
): void {
  const colors = SOLARPUNK_JESTER_COLORS;
  const center = { x: w / 2, y: h / 2 - 20 };
  drawSolarpunkBase(ctx, { w, h }, colors, random);
  drawSunburst(ctx, center, 130, 205, colors);
  drawSunflowerJester(ctx, center, colors);
  drawTitlePlaque(ctx, { x: w / 2, y: h - 100 }, 'JESTER', colors, SPECIAL_PLAQUE_WIDTH);
  drawCornerLetter(ctx, { w, h }, 'J', colors);
}

/** Special card: watercolour-washed emblem in ink line art on a brass medallion, botanical ink in the card's colour */
export function drawSolarpunkSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`solarpunk|${type}`)
): void {
  const face = getSpecialCardFace(type);
  const { signature } = face.palette;
  const { PAPER: paper } = SOLARPUNK_SPECIAL;
  const colors: SolarpunkColors = {
    paper,
    tint: blendHex(signature, paper, SOLARPUNK_SPECIAL.TINT_FADE),
    ink: blendHex(signature, '#000000', SOLARPUNK_SPECIAL.INK_SHADE),
    brass: SOLARPUNK_SPECIAL.BRASS,
  };
  const { emblem, value } = layoutSpecialFace({ x: w / 2, y: h / 2 - 20 }, SOLARPUNK_SPECIAL.EMBLEM_RADIUS, face);

  drawSolarpunkBase(ctx, { w, h }, colors, random);
  drawSunburst(ctx, emblem, emblem.size * SOLARPUNK_SPECIAL.SUNBURST_INNER, emblem.size * SOLARPUNK_SPECIAL.SUNBURST_OUTER, colors);
  drawBrassMedallion(ctx, emblem, emblem.size * SOLARPUNK_SPECIAL.MEDALLION_SCALE, colors);
  const palette = mapEmblemPalette(face.palette, (color, token) =>
    token === 'ink' ? blendHex(colors.ink, '#000000', SOLARPUNK_SPECIAL.LINE_SHADE) : blendHex(color, paper, SOLARPUNK_SPECIAL.WASH)
  );
  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: SOLARPUNK_SPECIAL.OUTLINE });

  const serif = (px: number) => `bold ${px}px ${SOLARPUNK_SERIF}`;
  if (value && face.valueLabel) {
    ctx.font = serif(value.fontSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = colors.brass;
    ctx.strokeText(face.valueLabel, value.x, value.y);
    ctx.fillStyle = mixColor(colors.ink, 'black', 0.25);
    ctx.fillText(face.valueLabel, value.x, value.y);
  }
  const titleSize = fitFontSize(ctx, face.title, serif, SOLARPUNK_TITLE_FONT_SIZE, SOLARPUNK_SPECIAL.TITLE_MAX_WIDTH);
  drawTitlePlaque(ctx, { x: w / 2, y: h - 100 }, face.title, colors, SPECIAL_PLAQUE_WIDTH, titleSize);
  drawCornerLetter(ctx, { w, h }, face.cornerLabel, colors, fitFontSize(ctx, face.cornerLabel, serif, CORNER_FONT_SIZE, SOLARPUNK_SPECIAL.CORNER_MAX_WIDTH));
}
