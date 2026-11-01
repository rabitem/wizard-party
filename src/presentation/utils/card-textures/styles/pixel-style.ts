'use client';

/**
 * Pixel card art style: 8-bit faces painted on a 64-column grid and scaled up
 * with imageSmoothingEnabled = false (see pixel-canvas.ts). Number cards show
 * a stepped gold frame, a suit scene, bitmap numerals in mirrored corners and
 * a "game window" with the suit sprite; Wizard and Jester are full sprites.
 * Colour roles come from trend-card-themes.ts.
 */

import type { SpecialCardType } from '@shared/domain';
import type { DrawNumberCardParams } from '../numbered-card-drawing';
import { drawSpecialCardEmblem, getSpecialCardFace, layoutSpecialFace, splitValueLabel } from '../special-cards';
import {
  measurePixelText,
  paintPixelArt,
  paintPixelVector,
  pixelGridRows,
  pixelRandom,
  spriteSize,
  type PixelPainter,
} from './pixel-canvas';
import { PIXEL_FONTS } from './pixel-font';
import {
  PIXEL_GRID_COLS,
  centeredSprite,
  centeredText,
  drawGameWindow,
  drawMirrored,
  drawPixelScene,
  drawSteppedFrame,
  fitLabel,
} from './pixel-primitives';
import { JESTER_SPRITE, MOON, SPARKLE, SUIT_SPRITES, WIZARD_SPRITE } from './pixel-sprites';
import { blendHex, getCornerLayout, mixColor } from './style-shared';

/** Fixed palettes for the theme-independent Wizard and Jester faces */
export const PIXEL_SPECIAL_COLORS = {
  ink: '#0a0618',
  gold: '#ffd93b',
  goldShade: '#b8860b',
  goldLight: '#fff3a8',
  wizard: {
    skyTop: '#060a26',
    skyBottom: '#2a1a6a',
    floorA: '#1d2766',
    floorB: '#142060',
    star: '#ffffff',
    moon: '#fff3a8',
    moonShade: '#d8c060',
    sprite: {
      o: '#10081e',
      h: '#3a4bd8',
      s: '#ffd93b',
      f: '#f2c49b',
      e: '#10081e',
      w: '#eef2ff',
      r: '#7a3be8',
      R: '#47209c',
      t: '#a8743a',
      c: '#6fe8ff',
      b: '#3a2410',
    },
  },
  jester: {
    diamondA: '#3a1a5a',
    diamondB: '#26103e',
    spark: '#4ade5a',
    sprite: {
      o: '#14081a',
      b: '#ffd93b',
      l: '#ff3b55',
      m: '#2fd35a',
      d: '#ffd93b',
      w: '#f4f7ff',
      f: '#f2c49b',
      e: '#14081a',
      k: '#ff3b55',
      L: '#e8304a',
      M: '#25b84c',
    },
  },
} as const;

/** Corner badge height (7-row numeral plus 1 cell padding) and its top row; keeps clear of the centre window */
const BADGE_H = 9;
const CORNER_TOP = 5;
/** Centre window height in cells */
const WINDOW_H = 48;
/** Top row of the court-card titles, their letter scale and the cells kept clear of the frame */
const TITLE_TOP = 5;
const TITLE_SCALE = 2;
const TITLE_MARGIN = 6;

interface TitleColors {
  ink: string;
  gold: string;
}

/** Special card faces: emblem placement in grid cells and the spotlight disc behind it */
const PIXEL_SPECIAL = {
  CENTER_ROW: 47,
  EMBLEM_RADIUS: 19,
  /** Ink outline of the rasterised emblem, in cells */
  OUTLINE: 1,
  SPOTLIGHT_PAD: 3,
  /** How much of the signature colour tints the spotlight */
  SPOTLIGHT_TINT: 0.3,
  STARS: 16,
  /** Cells between the whole value and its stacked fraction */
  FRACTION_GAP: 1,
} as const;

const SPECIAL_FRAME = {
  ink: PIXEL_SPECIAL_COLORS.ink,
  metal: PIXEL_SPECIAL_COLORS.gold,
  metalShade: PIXEL_SPECIAL_COLORS.goldShade,
  light: PIXEL_SPECIAL_COLORS.goldLight,
};

export function drawPixelNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes } = params;
  const ink = mixColor(theme.primary, 'black', 0.78);
  const light = mixColor(theme.accent, 'white', 0.65);
  const spriteColors = {
    o: ink,
    a: theme.accent,
    b: mixColor(theme.accent, 'black', 0.38),
    h: light,
    g: theme.gold,
  };
  const sprite = SUIT_SPRITES[suit];
  const label = String(value);
  const cell = w / PIXEL_GRID_COLS;

  paintPixelArt(ctx, w, h, PIXEL_GRID_COLS, (p) => {
    p.ditherGradient(theme.secondary, theme.primary);
    drawPixelScene(
      p,
      theme.pattern,
      { dark: mixColor(theme.primary, 'black', 0.35), light: mixColor(theme.secondary, 'white', 0.25), accent: theme.gold },
      `${suit}|${value}|${theme.name}`
    );
    drawSteppedFrame(p, { ink, metal: theme.gold, metalShade: mixColor(theme.gold, 'black', 0.4), light: mixColor(theme.gold, 'white', 0.55) });

    // Corner index: bitmap value on a notched badge with the suit sprite below
    const layout = getCornerLayout(value, fontSizes);
    const textW = measurePixelText(label, PIXEL_FONTS.big);
    const spriteW = spriteSize(sprite).w;
    const boxW = Math.max(textW + 4, spriteW);
    const boxH = BADGE_H + 1 + sprite.length;
    const x = Math.max(6, Math.round(layout.x / cell) - Math.round(boxW / 2));
    drawMirrored(p, { x, y: CORNER_TOP, w: boxW, h: boxH }, (bx, by, flip) => {
      const badgeY = flip ? by + boxH - BADGE_H : by;
      const spriteY = flip ? by : by + BADGE_H + 1;
      p.panel(bx + Math.round((boxW - textW - 4) / 2), badgeY, textW + 4, BADGE_H, ink);
      p.text(label, bx + Math.round((boxW - textW) / 2), badgeY + 1, { font: 'big', color: light, flip });
      p.sprite(sprite, bx + Math.round((boxW - spriteW) / 2), spriteY, spriteColors, { flip });
    });

    drawCenterWindow(p, { label, name: theme.name, sprite, spriteColors, ink, light, theme });
  });
}

interface CenterWindowArgs {
  label: string;
  name: string;
  sprite: readonly string[];
  spriteColors: Record<string, string>;
  ink: string;
  light: string;
  theme: DrawNumberCardParams['theme'];
}

/** Centre panel: title bar with the suit name, big sprite, big numeral */
function drawCenterWindow(p: PixelPainter, a: CenterWindowArgs): void {
  const wx = Math.round(p.cols * 0.27);
  const ww = p.cols - wx * 2;
  const wh = WINDOW_H;
  const wy = Math.round((p.rows - wh) / 2);
  const inner = drawGameWindow(
    p,
    { x: wx, y: wy, w: ww, h: wh },
    {
      ink: a.ink,
      frame: a.theme.gold,
      frameLight: mixColor(a.theme.gold, 'white', 0.55),
      inside: mixColor(a.theme.primary, 'black', 0.5),
      scanline: mixColor(a.theme.primary, 'black', 0.62),
    }
  );
  const mid = inner.x + inner.w / 2;

  // Title bar
  p.rect(inner.x, inner.y, inner.w, 7, a.theme.gold);
  p.rect(inner.x, inner.y + 6, inner.w, 1, mixColor(a.theme.gold, 'black', 0.35));
  centeredText(p, fitLabel(a.name, inner.w - 4), mid, inner.y + 1, { color: a.ink });

  // Sprite with a soft pixel halo, then the value
  const spriteY = inner.y + 9;
  p.rect(Math.round(mid - 7), spriteY + 2, 14, 14, mixColor(a.theme.primary, 'black', 0.3));
  centeredSprite(p, a.sprite, { cx: mid, y: spriteY }, a.spriteColors, 2);
  centeredText(p, a.label, mid, spriteY + 20, { font: 'big', scale: 2, color: a.light, shadow: a.ink });
}

/** Scatters twinkles and single-cell stars from a fixed seed */
function drawStarField(p: PixelPainter, seed: string, count: number, star: string, sparkle: string): void {
  const rand = pixelRandom(seed);
  for (let i = 0; i < count; i++) {
    p.rect(5 + Math.floor(rand() * (p.cols - 10)), 5 + Math.floor(rand() * (p.rows - 10)), 1, 1, star);
  }
  for (let i = 0; i < 4; i++) {
    p.sprite(SPARKLE, 6 + Math.floor(rand() * (p.cols - 17)), 6 + Math.floor(rand() * (p.rows - 30)), { a: sparkle, h: star });
  }
}

/**
 * Title at the top and again upside-down at the bottom, like a court card.
 * Long titles (SHAPESHIFTER) drop to single-size letters to stay inside the frame.
 */
function drawMirroredTitle(p: PixelPainter, title: string, colors: TitleColors = PIXEL_SPECIAL_COLORS): void {
  const fits = measurePixelText(title, PIXEL_FONTS.small, TITLE_SCALE) <= p.cols - TITLE_MARGIN * 2;
  const scale = fits ? TITLE_SCALE : 1;
  const width = measurePixelText(title, PIXEL_FONTS.small, scale);
  const height = PIXEL_FONTS.small.height * scale;
  const { ink, gold } = colors;
  drawMirrored(p, { x: Math.round((p.cols - width) / 2), y: TITLE_TOP, w: width, h: height }, (x, y, flip) => {
    p.panel(x - 2, y - 1, width + 4, height + 2, ink);
    p.text(title, x, y, { scale, color: gold, flip });
  });
}

export function drawPixelWizardCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const c = PIXEL_SPECIAL_COLORS.wizard;
  paintPixelArt(ctx, w, h, PIXEL_GRID_COLS, (p) => {
    p.ditherGradient(c.skyTop, c.skyBottom);
    drawStarField(p, 'wizard', 22, c.star, c.sprite.c);
    p.sprite(MOON, p.cols - 16, 20, { a: c.moon, b: c.moonShade });

    const size = spriteSize(WIZARD_SPRITE, 2);
    const spriteY = Math.round((p.rows - size.h) / 2);

    // Checkered arcade floor under the boots
    const floorY = spriteY + size.h - 10;
    p.pattern(4, floorY, p.cols - 8, p.rows - 4 - floorY, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 3)) % 2 === 0 ? c.floorA : c.floorB));
    p.rect(4, floorY, p.cols - 8, 1, c.sprite.c);

    p.sprite(WIZARD_SPRITE, Math.round((p.cols - size.w) / 2) + 1, spriteY, c.sprite, { scale: 2 });

    drawSteppedFrame(p, SPECIAL_FRAME);
    drawMirroredTitle(p, 'WIZARD');
  });
}

export function drawPixelJesterCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const c = PIXEL_SPECIAL_COLORS.jester;
  paintPixelArt(ctx, w, h, PIXEL_GRID_COLS, (p) => {
    // Harlequin diamonds
    p.pattern(0, 0, p.cols, p.rows, (x, y) => {
      const dx = Math.abs((x % 8) - 4) / 4;
      const dy = Math.abs((y % 12) - 6) / 6;
      return dx + dy <= 1 ? c.diamondA : c.diamondB;
    });
    drawStarField(p, 'jester', 10, PIXEL_SPECIAL_COLORS.goldLight, c.spark);

    const size = spriteSize(JESTER_SPRITE, 2);
    const x = Math.round((p.cols - size.w) / 2);
    const y = Math.round((p.rows - size.h) / 2) + 2;
    // Spotlight disc behind the jester
    p.pattern(x - 2, y + 10, size.w + 4, size.h - 6, (px, py) => {
      const nx = (px - p.cols / 2) / (size.w / 2 + 2);
      const ny = (py - (y + size.h / 2 + 2)) / (size.h / 2 - 3);
      return nx * nx + ny * ny <= 1 ? '#4a2470' : null;
    });
    p.sprite(JESTER_SPRITE, x, y, c.sprite, { scale: 2 });

    drawSteppedFrame(p, SPECIAL_FRAME);
    drawMirroredTitle(p, 'JESTER');
  });
}

/** Big value with its fraction stacked beside it ('7' + 1/2), since the bitmap fonts have no fraction glyphs */
function drawPixelValue(p: PixelPainter, label: string, at: { x: number; y: number }, colors: { ink: string; light: string }): void {
  const { whole, fraction } = splitValueLabel(label);
  const { big, small } = PIXEL_FONTS;
  const wholeW = measurePixelText(whole, big, TITLE_SCALE);
  const wholeH = big.height * TITLE_SCALE;
  const fractionW = fraction ? Math.max(...fraction.map((part) => measurePixelText(part, small))) : 0;
  const totalW = wholeW + (fraction ? PIXEL_SPECIAL.FRACTION_GAP + fractionW : 0);
  const x = Math.round(at.x - totalW / 2);
  const y = Math.round(at.y - wholeH / 2);

  p.panel(x - 2, y - 2, totalW + 4, wholeH + 4, colors.ink);
  p.text(whole, x, y, { font: 'big', scale: TITLE_SCALE, color: colors.light });
  if (!fraction) return;
  const fx = x + wholeW + PIXEL_SPECIAL.FRACTION_GAP;
  const barY = y + small.height + 1;
  p.text(fraction[0], fx, y, { color: colors.light });
  p.rect(fx, barY, fractionW, 1, colors.light);
  p.text(fraction[1], fx, barY + 2, { color: colors.light });
}

/**
 * Special card: the shared vector emblem rasterised onto the grid between a
 * dithered backdrop pass and a frame/title pass in the card's own colours.
 */
export function drawPixelSpecialCard(ctx: CanvasRenderingContext2D, w: number, h: number, type: SpecialCardType): void {
  const face = getSpecialCardFace(type);
  const { palette } = face;
  const cols = PIXEL_GRID_COLS;
  const center = { x: cols / 2, y: Math.min(PIXEL_SPECIAL.CENTER_ROW, pixelGridRows(w, h, cols) / 2) };
  const { emblem, value } = layoutSpecialFace(center, PIXEL_SPECIAL.EMBLEM_RADIUS, face);

  paintPixelArt(ctx, w, h, cols, (p) => {
    p.ditherGradient(palette.field, palette.fieldEdge);
    drawStarField(p, `special|${type}`, PIXEL_SPECIAL.STARS, palette.glow, palette.accent);
    const r = emblem.size + PIXEL_SPECIAL.SPOTLIGHT_PAD;
    const spotlight = blendHex(palette.field, palette.signature, PIXEL_SPECIAL.SPOTLIGHT_TINT);
    p.pattern(Math.floor(emblem.x - r), Math.floor(emblem.y - r), Math.ceil(r * 2) + 1, Math.ceil(r * 2) + 1, (px, py) => {
      const dx = px + 0.5 - emblem.x;
      const dy = py + 0.5 - emblem.y;
      return dx * dx + dy * dy <= r * r ? spotlight : null;
    });
  });

  paintPixelVector(ctx, w, h, cols, (g) => drawSpecialCardEmblem(g, type, emblem, { palette, outline: PIXEL_SPECIAL.OUTLINE }));

  paintPixelArt(ctx, w, h, cols, (p) => {
    drawSteppedFrame(p, {
      ink: palette.ink,
      metal: palette.metal,
      metalShade: mixColor(palette.metal, 'black', 0.4),
      light: mixColor(palette.metal, 'white', 0.55),
    });
    drawMirroredTitle(p, face.title, { ink: palette.ink, gold: palette.metal });
    if (value && face.valueLabel) {
      drawPixelValue(p, face.valueLabel, value, { ink: palette.ink, light: mixColor(palette.metal, 'white', 0.55) });
    }
  });
}
