'use client';

/**
 * Neon card art style: dark glass card body over a synthwave floor grid,
 * neon tube outline suit glyphs inside a dashed ring and glowing numerals.
 *
 * Colour roles for number cards (see trend-card-themes.ts): primary = glass
 * body, secondary = glass panel, accent = the suit's tube colour, gold = the
 * pale glow used for secondary lines and numeral fill.
 */

import type { SpecialCardType } from '@shared/domain';
import { createSeededRandom, type RandomSource } from '../drawing-utils';
import { createNumberCardPatternSeed, type DrawNumberCardParams } from '../numbered-card-drawing';
import { drawSpecialCardEmblem, getSpecialCardFace, layoutSpecialFace, mapEmblemPalette } from '../special-cards';
import {
  NEON_FONT,
  drawNeonBackdrop,
  drawNeonFrame,
  drawNeonRing,
  drawNeonText,
  drawNeonTitle,
  sparklePath,
  strokeNeonPath,
  type NeonColors,
} from './neon-primitives';
import { blendHex, drawMirroredCorners, fitFontSize, getCornerLayout, mixColor, resetShadow, starPath, type CardSize } from './style-shared';

const NEON_WIZARD_COLORS: NeonColors = { body: '#06040f', panel: '#160a2e', neon: '#22e5ff', glow: '#ff9cf0' };
const NEON_JESTER_COLORS: NeonColors = { body: '#0a0410', panel: '#220a26', neon: '#ff3fd2', glow: '#9dffd6' };
const EMBLEM_RING_RADIUS = 104;
const SPARKLES = 6;
const CORNER_FONT_SIZE = 64;
const NEON_SPECIAL = {
  EMBLEM_RADIUS: 108,
  /** Tube width of the emblem outlines and their glow */
  OUTLINE: 3.5,
  GLOW: 14,
  /** Emblem fills sink into the dark glass so the tubes carry the shape */
  FILL_DIM: 0.55,
  /** Glass tones: the signature colour pushed almost to black */
  BODY_DIM: 0.93,
  PANEL_DIM: 0.82,
  TUBE_LIGHT: 0.35,
  RING_SCALE: 1.24,
  TITLE_SIZE: 40,
  TITLE_MAX_WIDTH: 300,
  CORNER_MAX_WIDTH: 84,
} as const;
const NEON_BLACK = '#020106';

function suitColors(theme: DrawNumberCardParams['theme']): NeonColors {
  return { body: theme.primary, panel: theme.secondary, neon: theme.accent, glow: theme.gold };
}

/** Faint twinkles scattered in the upper glass (seeded, so cards stay stable). */
function drawSparkles(ctx: CanvasRenderingContext2D, { w, h }: CardSize, colors: NeonColors, random: RandomSource): void {
  for (let i = 0; i < SPARKLES; i++) {
    const x = 70 + random() * (w - 140);
    const y = 70 + random() * h * 0.5;
    sparklePath(ctx, x, y, 5 + random() * 7);
    strokeNeonPath(ctx, i % 2 === 0 ? colors.glow : colors.neon, 1.5);
  }
}

/** Big corner letter (W / J / special card index) with a tiny sparkle beneath it. */
function drawCornerLetter(
  ctx: CanvasRenderingContext2D,
  size: CardSize,
  letter: string,
  colors: NeonColors,
  fontSize: number = CORNER_FONT_SIZE
): void {
  drawMirroredCorners(ctx, size, { x: 82, y: 88 }, () => {
    drawNeonText(ctx, letter, 0, 0, {
      font: `italic ${fontSize}px ${NEON_FONT}`,
      color: colors.neon,
      width: 3,
      fill: mixColor(colors.neon, 'white', 0.55),
    });
    sparklePath(ctx, 0, 56, 10);
    strokeNeonPath(ctx, colors.glow, 2);
  });
}

export function drawNeonNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(`neon|${createNumberCardPatternSeed(suit, value, theme)}`);
  const colors = suitColors(theme);
  const size = { w, h };
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawNeonBackdrop(ctx, size, colors, cy);
  drawSparkles(ctx, size, colors, random);
  drawNeonRing(ctx, { cx, cy, r: EMBLEM_RING_RADIUS }, colors);
  // Outline-only glyph: the suit bent from a single neon tube
  drawNeonText(ctx, theme.canvasSymbol, cx, cy, {
    font: `${fontSizes.center}px Arial`,
    color: colors.neon,
    width: Math.max(3, fontSizes.center * 0.035),
  });
  drawNeonFrame(ctx, size, colors);
  drawNeonTitle(ctx, size, theme.name, colors);

  const layout = getCornerLayout(value, fontSizes);
  const numberSize = Math.round(fontSizes.corner * (value >= 10 ? 0.8 : 0.92));
  drawMirroredCorners(ctx, size, layout, () => {
    drawNeonText(ctx, String(value), 0, 0, {
      font: `italic ${numberSize}px ${NEON_FONT}`,
      color: colors.neon,
      width: Math.max(2.5, numberSize * 0.05),
      fill: mixColor(colors.glow, 'white', 0.35),
    });
    drawNeonText(ctx, suitSymbols[suit], 0, layout.radius + fontSizes.cornerSymbol * 0.8, {
      font: `${fontSizes.cornerSymbol}px Arial`,
      color: colors.neon,
      width: 1.5,
      fill: colors.glow,
    });
  });
}

/** Wizard hat bent from neon tubing: brim, curling cone and a band. */
function drawNeonHat(ctx: CanvasRenderingContext2D, cx: number, cy: number, colors: NeonColors): void {
  ctx.beginPath();
  ctx.moveTo(cx - 120, cy + 70);
  ctx.quadraticCurveTo(cx, cy + 96, cx + 120, cy + 70);
  ctx.moveTo(cx - 70, cy + 72);
  ctx.quadraticCurveTo(cx - 30, cy - 10, cx + 10, cy - 120);
  ctx.quadraticCurveTo(cx + 40, cy - 150, cx + 70, cy - 120);
  ctx.moveTo(cx + 10, cy - 120);
  ctx.quadraticCurveTo(cx + 30, cy - 10, cx + 70, cy + 72);
  strokeNeonPath(ctx, colors.neon, 6);

  ctx.beginPath();
  ctx.moveTo(cx - 52, cy + 34);
  ctx.quadraticCurveTo(cx + 5, cy + 48, cx + 58, cy + 34);
  strokeNeonPath(ctx, colors.glow, 4);

  starPath(ctx, { x: cx + 12, y: cy - 36, outer: 26, inner: 11, points: 5 });
  strokeNeonPath(ctx, colors.glow, 3.5);
}

export function drawNeonWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('neon|wizard')
): void {
  const colors = NEON_WIZARD_COLORS;
  const size = { w, h };
  const cx = w / 2;
  const cy = h / 2 - 30;

  drawNeonBackdrop(ctx, size, colors, cy);
  drawSparkles(ctx, size, colors, random);
  drawNeonRing(ctx, { cx, cy, r: 150, segments: 18 }, colors);
  drawNeonHat(ctx, cx, cy, colors);
  drawNeonFrame(ctx, size, colors);
  drawNeonTitle(ctx, size, 'WIZARD', colors, 40);
  drawCornerLetter(ctx, size, 'W', colors);
}

/** Jester mask in neon: three-point hat with bells, face, happy eyes and grin. */
function drawNeonJester(ctx: CanvasRenderingContext2D, cx: number, cy: number, colors: NeonColors): void {
  const brimY = cy - 26;
  const tips: Array<[number, number]> = [[cx - 120, cy - 100], [cx, cy - 160], [cx + 120, cy - 100]];
  const [left, middle, right] = tips;
  const valleyY = brimY - 44;
  ctx.beginPath();
  ctx.moveTo(cx - 84, brimY);
  ctx.quadraticCurveTo(cx - 100, brimY - 30, left[0], left[1]);
  ctx.quadraticCurveTo(cx - 60, cy - 90, cx - 34, valleyY);
  ctx.quadraticCurveTo(cx - 30, cy - 110, middle[0], middle[1]);
  ctx.quadraticCurveTo(cx + 30, cy - 110, cx + 34, valleyY);
  ctx.quadraticCurveTo(cx + 60, cy - 90, right[0], right[1]);
  ctx.quadraticCurveTo(cx + 100, brimY - 30, cx + 84, brimY);
  ctx.closePath();
  strokeNeonPath(ctx, colors.neon, 5);

  for (const [tx, ty] of tips) {
    ctx.beginPath();
    ctx.arc(tx, ty, 11, 0, Math.PI * 2);
    strokeNeonPath(ctx, colors.glow, 3.5);
  }

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy + 34, 64, 0, Math.PI * 2);
  strokeNeonPath(ctx, colors.neon, 5);

  // Happy closed eyes and a wide grin
  ctx.beginPath();
  for (const ex of [cx - 24, cx + 24]) {
    ctx.moveTo(ex - 11, cy + 26);
    ctx.arc(ex, cy + 26, 11, Math.PI, Math.PI * 2);
  }
  ctx.moveTo(cx - 34, cy + 50);
  ctx.quadraticCurveTo(cx, cy + 86, cx + 34, cy + 50);
  strokeNeonPath(ctx, colors.glow, 3.5);

  // Diamond cheek marks
  for (const side of [-1, 1]) {
    const dx = cx + side * 44;
    const dy = cy + 50;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 9);
    ctx.lineTo(dx + 6, dy);
    ctx.lineTo(dx, dy + 9);
    ctx.lineTo(dx - 6, dy);
    ctx.closePath();
    strokeNeonPath(ctx, colors.neon, 2.5);
  }
}

export function drawNeonJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('neon|jester')
): void {
  const colors = NEON_JESTER_COLORS;
  const size = { w, h };
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawNeonBackdrop(ctx, size, colors, cy);
  drawSparkles(ctx, size, colors, random);
  drawNeonJester(ctx, cx, cy, colors);
  drawNeonFrame(ctx, size, colors);
  drawNeonTitle(ctx, size, 'JESTER', colors, 40);
  drawCornerLetter(ctx, size, 'J', colors);
}

/** Special card: glass tinted by the card's signature colour, the emblem bent from glowing tubes */
export function drawNeonSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`neon|${type}`)
): void {
  const face = getSpecialCardFace(type);
  const { signature, accent } = face.palette;
  const colors: NeonColors = {
    body: blendHex(signature, NEON_BLACK, NEON_SPECIAL.BODY_DIM),
    panel: blendHex(signature, NEON_BLACK, NEON_SPECIAL.PANEL_DIM),
    neon: signature,
    glow: accent,
  };
  const size = { w, h };
  const { emblem, value } = layoutSpecialFace({ x: w / 2, y: h / 2 - 20 }, NEON_SPECIAL.EMBLEM_RADIUS, face);

  drawNeonBackdrop(ctx, size, colors, emblem.y);
  drawSparkles(ctx, size, colors, random);
  drawNeonRing(ctx, { cx: emblem.x, cy: emblem.y, r: emblem.size * NEON_SPECIAL.RING_SCALE, segments: 18 }, colors);

  const tube = blendHex(signature, '#ffffff', NEON_SPECIAL.TUBE_LIGHT);
  const palette = mapEmblemPalette(face.palette, (color, token) => {
    if (token === 'ink') return tube;
    if (token === 'primary' || token === 'secondary') return blendHex(color, colors.body, NEON_SPECIAL.FILL_DIM);
    return color;
  });
  ctx.save();
  ctx.shadowColor = signature;
  ctx.shadowBlur = NEON_SPECIAL.GLOW;
  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: NEON_SPECIAL.OUTLINE });
  ctx.restore();
  resetShadow(ctx);

  if (value && face.valueLabel) {
    drawNeonText(ctx, face.valueLabel, value.x, value.y, {
      font: `italic ${value.fontSize}px ${NEON_FONT}`,
      color: colors.neon,
      width: 4,
      fill: mixColor(colors.glow, 'white', 0.35),
    });
  }
  drawNeonFrame(ctx, size, colors);
  const font = (px: number) => `italic ${px}px ${NEON_FONT}`;
  drawNeonTitle(ctx, size, face.title, colors, fitFontSize(ctx, face.title, font, NEON_SPECIAL.TITLE_SIZE, NEON_SPECIAL.TITLE_MAX_WIDTH));
  drawCornerLetter(ctx, size, face.cornerLabel, colors, fitFontSize(ctx, face.cornerLabel, font, CORNER_FONT_SIZE, NEON_SPECIAL.CORNER_MAX_WIDTH));
}
