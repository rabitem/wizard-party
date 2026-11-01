'use client';

/**
 * Celestial Tarot card art style: midnight star-field stock, a gilded tarot
 * frame with an arched window, roman-numeral title plates, celestial suit
 * emblems (sun, moon, comet, star) in banded gold foil, and an orbit of
 * small emblem pips counting the card value.
 *
 * Colour roles for number cards (from trend-card-themes.ts): primary /
 * secondary = night sky, accent = nebula + window glow, gold = foil metal.
 */

import { SPECIAL_CARD_TYPES, Suit, type SpecialCardType } from '@shared/domain';
import { createSeededRandom, drawPentagram, type RandomSource } from '../drawing-utils';
import { drawJesterHat } from '../jester-card-drawing';
import { createNumberCardPatternSeed, type DrawNumberCardParams } from '../numbered-card-drawing';
import {
  drawSpecialCardEmblem,
  getSpecialCardFace,
  layoutSpecialFace,
  splitValueLabel,
  type SpecialCardFace,
} from '../special-cards';
import { drawFoilText } from './hyperreal-primitives';
import {
  blendHex,
  drawMirroredCorners,
  fitFontSize,
  getCornerLayout,
  measureTextWidth,
  mixColor,
  withAlpha,
  type CardSize,
  type Point,
} from './style-shared';
import {
  TAROT_SERIF,
  drawArchWindow,
  drawEmblem,
  drawGildedFrame,
  drawNightField,
  drawTitlePlate,
  foilAt,
  toRoman,
  type CelestialEmblem,
  type Rect,
} from './tarot-primitives';

const SUIT_EMBLEMS: Record<Suit, CelestialEmblem> = {
  [Suit.GIANTS]: 'sun',
  [Suit.ELVES]: 'moon',
  [Suit.DWARVES]: 'comet',
  [Suit.HUMANS]: 'star',
};

const TAROT_WIZARD = { base: '#140c34', light: '#2e1f66', nebula: '#8a6aff', metal: '#e6c46a', ink: '#1a1030' };
const TAROT_JESTER = { base: '#22092a', light: '#4a1a52', nebula: '#ff8a5a', metal: '#e6b45a', ink: '#2a0a24' };

const PLATE = { TOP_Y: 76, BOTTOM_OFFSET: 92, H: 42 } as const;
const ORBIT = { RADIUS: 108, PIP: 11 } as const;
const CORNER_FONT_SIZE = 72;
const TAROT_SPECIAL = {
  METAL: '#e6c46a',
  NIGHT: '#0b0820',
  /** How far the signature colour is pushed into the night sky (base / light stock) */
  BASE_DIM: 0.85,
  LIGHT_DIM: 0.62,
  EMBLEM_RADIUS: 100,
  OUTLINE: 2.5,
  HALO_SCALE: 1.25,
  GLORY_INNER: 0.7,
  /** Special cards continue the major arcana after The World (XXI) */
  FIRST_ARCANUM: 22,
  /** Plate font is the plate height times this (see drawTitlePlate) */
  PLATE_FONT: 0.62,
  PLATE_PADDING: 30,
  TOP_PLATE_MIN: 90,
  BOTTOM_PLATE_MIN: 200,
  CORNER_MAX_WIDTH: 84,
} as const;

function windowRect({ w, h }: CardSize): Rect {
  return { x: 118, y: 126, w: w - 236, h: h - 290 };
}

function windowCenter(size: CardSize): Point {
  const rect = windowRect(size);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h * 0.55 };
}

/** Soft coloured halo behind a centre emblem */
function drawHalo(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, color: string): void {
  const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  halo.addColorStop(0, withAlpha(color, 0.55));
  halo.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Thin foil orbit with `count` emblem pips spaced evenly from the top */
function drawOrbitPips(ctx: CanvasRenderingContext2D, center: Point, emblem: CelestialEmblem, count: number, metal: string): void {
  ctx.strokeStyle = withAlpha(metal, 0.55);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, ORBIT.RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const pip = { x: center.x + Math.cos(a) * ORBIT.RADIUS, y: center.y + Math.sin(a) * ORBIT.RADIUS };
    drawEmblem(ctx, emblem, pip, ORBIT.PIP, foilAt(ctx, pip, ORBIT.PIP, metal));
  }
}

/** Big foil letter in the mirrored corners (W / J / special card index) */
function drawCornerLetter(ctx: CanvasRenderingContext2D, size: CardSize, letter: string, metal: string, fontSize: number = CORNER_FONT_SIZE): void {
  drawMirroredCorners(ctx, size, { x: 84, y: 92 }, () => {
    drawFoilText(ctx, letter, 0, 0, { font: `bold ${fontSize}px ${TAROT_SERIF}`, metal, size: fontSize });
  });
}

export function drawTarotNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(`tarot|${createNumberCardPatternSeed(suit, value, theme)}`);
  const size = { w, h };
  const metal = theme.gold;
  const emblem = SUIT_EMBLEMS[suit];

  drawNightField(ctx, size, { base: theme.primary, light: theme.secondary, nebula: theme.accent }, random);
  drawGildedFrame(ctx, size, metal);
  drawArchWindow(ctx, windowRect(size), metal, theme.accent);

  const center = windowCenter(size);
  drawHalo(ctx, center, 96, theme.accent);
  drawOrbitPips(ctx, center, emblem, value, metal);
  drawEmblem(ctx, emblem, center, 70, foilAt(ctx, center, 70, metal));

  const ink = mixColor(theme.primary, 'black', 0.4);
  drawTitlePlate(ctx, { cx: w / 2, cy: PLATE.TOP_Y, w: 110, h: PLATE.H }, toRoman(value), { metal, ink });
  drawTitlePlate(ctx, { cx: w / 2, cy: h - PLATE.BOTTOM_OFFSET, w: 180, h: PLATE.H }, theme.name, { metal, ink });

  const layout = getCornerLayout(value, fontSizes);
  drawMirroredCorners(ctx, size, layout, () => {
    ctx.fillStyle = mixColor(theme.primary, 'black', 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, layout.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = foilAt(ctx, { x: 0, y: 0 }, layout.radius, metal);
    ctx.stroke();
    drawFoilText(ctx, String(value), 0, fontSizes.corner * 0.05, {
      font: `bold ${fontSizes.corner}px ${TAROT_SERIF}`,
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

/** Radiating hairline rays from a point (a "glory" behind the emblem) */
function drawGlory(ctx: CanvasRenderingContext2D, { x, y }: Point, inner: number, outer: number, color: string): void {
  ctx.strokeStyle = withAlpha(color, 0.45);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const len = i % 2 === 0 ? outer : outer * 0.78;
    ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.stroke();
}

export function drawTarotWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('tarot|wizard')
): void {
  const size = { w, h };
  const { metal, ink } = TAROT_WIZARD;
  drawNightField(ctx, size, TAROT_WIZARD, random);
  drawGildedFrame(ctx, size, metal);
  drawArchWindow(ctx, windowRect(size), metal, TAROT_WIZARD.nebula);

  const center = windowCenter(size);
  drawHalo(ctx, center, 120, TAROT_WIZARD.nebula);
  drawGlory(ctx, center, 70, 122, metal);

  // Engraved pentagram ring with the star of the magus at its heart
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = foilAt(ctx, center, 92, metal);
  ctx.beginPath();
  ctx.arc(center.x, center.y, 92, 0, Math.PI * 2);
  ctx.stroke();
  drawPentagram(ctx, center.x, center.y, 90);
  drawEmblem(ctx, 'star', center, 52, foilAt(ctx, center, 52, metal));

  // Crescent cradling the star from below, small sun and comet above
  drawEmblem(ctx, 'moon', { x: center.x - 4, y: center.y + 150 }, 34, foilAt(ctx, center, 160, metal));
  drawEmblem(ctx, 'sun', { x: center.x - 80, y: center.y - 150 }, 22, foilAt(ctx, center, 160, metal));
  drawEmblem(ctx, 'comet', { x: center.x + 80, y: center.y - 150 }, 22, foilAt(ctx, center, 160, metal));

  drawTitlePlate(ctx, { cx: w / 2, cy: PLATE.TOP_Y, w: 90, h: PLATE.H }, 'I', { metal, ink });
  drawTitlePlate(ctx, { cx: w / 2, cy: h - PLATE.BOTTOM_OFFSET, w: 200, h: PLATE.H }, 'WIZARD', { metal, ink });
  drawCornerLetter(ctx, size, 'W', metal);
}

/** Smiling gilded sun face for the fool */
function drawFoolFace(ctx: CanvasRenderingContext2D, center: Point, r: number, metal: string): void {
  drawEmblem(ctx, 'sun', center, r * 1.45, foilAt(ctx, center, r * 1.45, metal));
  const face = ctx.createRadialGradient(center.x - r * 0.3, center.y - r * 0.3, r * 0.1, center.x, center.y, r);
  face.addColorStop(0, '#fff6dc');
  face.addColorStop(1, '#e8c890');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = TAROT_JESTER.ink;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    // Closed, contented eyes
    ctx.beginPath();
    ctx.arc(center.x + side * r * 0.36, center.y - r * 0.1, r * 0.16, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(center.x, center.y + r * 0.12, r * 0.45, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = 'rgba(230,90,90,0.35)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(center.x + side * r * 0.55, center.y + r * 0.22, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTarotJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('tarot|jester')
): void {
  const size = { w, h };
  const { metal, ink } = TAROT_JESTER;
  drawNightField(ctx, size, TAROT_JESTER, random);
  drawGildedFrame(ctx, size, metal);
  drawArchWindow(ctx, windowRect(size), metal, TAROT_JESTER.nebula);

  const center = windowCenter(size);
  drawHalo(ctx, center, 130, TAROT_JESTER.nebula);
  // Little stars tumbling around the fool
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const p = { x: center.x + Math.cos(a) * 118, y: center.y + 20 + Math.sin(a) * 118 };
    drawEmblem(ctx, i % 2 ? 'star' : 'moon', p, 12, foilAt(ctx, p, 12, metal));
  }
  drawJesterHat(ctx, center.x, center.y - 10);
  drawFoolFace(ctx, { x: center.x, y: center.y + 30 }, 54, metal);

  drawTitlePlate(ctx, { cx: w / 2, cy: PLATE.TOP_Y, w: 90, h: PLATE.H }, '0', { metal, ink });
  drawTitlePlate(ctx, { cx: w / 2, cy: h - PLATE.BOTTOM_OFFSET, w: 200, h: PLATE.H }, 'JESTER', { metal, ink });
  drawCornerLetter(ctx, size, 'J', metal);
}

/**
 * Top plate number: valued cards show their value ('VII½'), the others
 * continue the major arcana ('XXII', 'XXIII', ...).
 */
function arcanumLabel(face: SpecialCardFace): string {
  if (face.valueLabel) {
    const { whole } = splitValueLabel(face.valueLabel);
    return `${toRoman(Number(whole))}${face.valueLabel.slice(whole.length)}`;
  }
  return toRoman(TAROT_SPECIAL.FIRST_ARCANUM + SPECIAL_CARD_TYPES.indexOf(face.type));
}

/** Title plate wide enough for its text */
function drawFittedPlate(ctx: CanvasRenderingContext2D, center: Point, text: string, minWidth: number, colors: { metal: string; ink: string }): void {
  const fontSize = Math.round(PLATE.H * TAROT_SPECIAL.PLATE_FONT);
  const textWidth = measureTextWidth(ctx, text, `bold ${fontSize}px ${TAROT_SERIF}`, fontSize);
  const w = Math.max(minWidth, textWidth + TAROT_SPECIAL.PLATE_PADDING);
  drawTitlePlate(ctx, { cx: center.x, cy: center.y, w, h: PLATE.H }, text, colors);
}

/** Special card: a gilded arcanum, the emblem in the arched window under the card's own nebula */
export function drawTarotSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`tarot|${type}`)
): void {
  const size = { w, h };
  const face = getSpecialCardFace(type);
  const { signature } = face.palette;
  const metal = TAROT_SPECIAL.METAL;
  // Night sky tinted by the signature colour; its darkest tone also inks the plates
  const ink = blendHex(signature, TAROT_SPECIAL.NIGHT, TAROT_SPECIAL.BASE_DIM);
  drawNightField(
    ctx,
    size,
    {
      base: ink,
      light: blendHex(signature, TAROT_SPECIAL.NIGHT, TAROT_SPECIAL.LIGHT_DIM),
      nebula: signature,
    },
    random
  );
  drawGildedFrame(ctx, size, metal);
  drawArchWindow(ctx, windowRect(size), metal, signature);

  const { emblem, value } = layoutSpecialFace(windowCenter(size), TAROT_SPECIAL.EMBLEM_RADIUS, face);
  drawHalo(ctx, emblem, emblem.size * TAROT_SPECIAL.HALO_SCALE, signature);
  drawGlory(ctx, emblem, emblem.size * TAROT_SPECIAL.GLORY_INNER, emblem.size * TAROT_SPECIAL.HALO_SCALE, metal);
  // Gilded line work instead of black ink
  const palette = { ...face.palette, ink: blendHex(metal, '#000000', 0.55) };
  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: TAROT_SPECIAL.OUTLINE });
  if (value && face.valueLabel) {
    drawFoilText(ctx, face.valueLabel, value.x, value.y, { font: `bold ${value.fontSize}px ${TAROT_SERIF}`, metal, size: value.fontSize });
  }

  drawFittedPlate(ctx, { x: w / 2, y: PLATE.TOP_Y }, arcanumLabel(face), TAROT_SPECIAL.TOP_PLATE_MIN, { metal, ink });
  drawFittedPlate(ctx, { x: w / 2, y: h - PLATE.BOTTOM_OFFSET }, face.title, TAROT_SPECIAL.BOTTOM_PLATE_MIN, { metal, ink });
  const cornerSize = fitFontSize(ctx, face.cornerLabel, (px) => `bold ${px}px ${TAROT_SERIF}`, CORNER_FONT_SIZE, TAROT_SPECIAL.CORNER_MAX_WIDTH);
  drawCornerLetter(ctx, size, face.cornerLabel, metal, cornerSize);
}
