'use client';

/**
 * Pixel Arcade card back, painted on the same low-res grid as the faces:
 * dithered night sky with stars, a stepped gold frame ringed by marquee
 * bulbs, corner hearts, a diamond "screen" holding a pixel wizard hat and a
 * mirrored INSERT COIN banner.
 */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { measurePixelText, paintPixelArt, pixelRandom, spriteSize, type PixelPainter, type PixelSprite } from '../styles/pixel-canvas';
import { PIXEL_FONTS } from '../styles/pixel-font';
import { PIXEL_GRID_COLS, drawMirrored, drawSteppedFrame } from '../styles/pixel-primitives';
import { SPARKLE } from '../styles/pixel-sprites';
import { mixColor } from '../styles/style-shared';
import type { CardBackPainter } from './back-shared';

/** o outline, h hat, s star, b band */
const WIZARD_HAT: PixelSprite = [
  '......o......',
  '.....oho.....',
  '.....ohho....',
  '....ohhho....',
  '....ohsho....',
  '...ohsssho...',
  '...ohhshho...',
  '..ohhhhhhho..',
  '..obbbbbbbo..',
  '.ohhhhhhhhho.',
  'ooooooooooooo',
];

/** Small heart for the corners: o outline, a fill, h highlight */
const MINI_HEART: PixelSprite = ['.o.o.', 'ohaao', 'oaaao', '.oao.', '..o..'];

const BANNER_TEXT = 'INSERT COIN';
/** Top row of the banner text (below the corner hearts) */
const BANNER_TOP = 15;
/** Half-diagonal of the centre diamond in cells */
const DIAMOND_RADIUS = 21;
/** Spacing between marquee bulbs along the frame */
const BULB_STEP = 4;

function drawSky(p: PixelPainter, palette: CardBackPalette): void {
  p.ditherGradient(palette.deep, palette.base);
  const rand = pixelRandom('pixel-back');
  const star = mixColor(palette.glow, 'black', 0.15);
  for (let i = 0; i < 26; i++) p.rect(6 + Math.floor(rand() * (p.cols - 12)), 6 + Math.floor(rand() * (p.rows - 12)), 1, 1, star);
  for (let i = 0; i < 4; i++) {
    p.sprite(SPARKLE, 7 + Math.floor(rand() * (p.cols - 19)), 7 + Math.floor(rand() * (p.rows - 19)), { a: palette.metalShade, h: palette.glow });
  }
}

/** Alternating metal/accent bulbs just inside the frame (a theatre marquee) */
function drawBulbs(p: PixelPainter, palette: CardBackPalette): void {
  const inset = 5;
  let i = 0;
  const bulb = (x: number, y: number) => p.rect(x, y, 1, 1, i++ % 2 === 0 ? palette.glow : palette.accent);
  for (let x = inset + 3; x < p.cols - inset - 3; x += BULB_STEP) {
    bulb(x, inset);
    bulb(p.cols - 1 - x, p.rows - 1 - inset);
  }
  for (let y = inset + 3; y < p.rows - inset - 3; y += BULB_STEP) {
    bulb(inset, p.rows - 1 - y);
    bulb(p.cols - 1 - inset, y);
  }
}

/** Stepped diamond screen with a metal edge and scanlines */
function drawDiamond(p: PixelPainter, palette: CardBackPalette, cx: number, cy: number): void {
  const inside = mixColor(palette.deep, 'black', 0.35);
  const scan = mixColor(palette.deep, 'black', 0.55);
  const r = DIAMOND_RADIUS;
  p.pattern(cx - r - 1, cy - r - 1, r * 2 + 3, r * 2 + 3, (x, y) => {
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (d > r + 1) return null;
    if (d > r) return palette.ink;
    if (d > r - 2) return y < cy ? palette.metal : palette.metalShade;
    if (d > r - 3) return palette.ink;
    return y % 2 === 0 ? inside : scan;
  });
}

function drawBanner(p: PixelPainter, palette: CardBackPalette): void {
  const width = measurePixelText(BANNER_TEXT, PIXEL_FONTS.small);
  const x = Math.round((p.cols - width) / 2);
  drawMirrored(p, { x, y: BANNER_TOP, w: width, h: PIXEL_FONTS.small.height }, (bx, by, flip) => {
    p.panel(bx - 3, by - 2, width + 6, PIXEL_FONTS.small.height + 4, palette.metal);
    p.rect(bx - 2, by - 1, width + 4, PIXEL_FONTS.small.height + 2, palette.ink);
    p.text(BANNER_TEXT, bx, by, { color: palette.metal, flip });
  });
}

function drawCornerHearts(p: PixelPainter, palette: CardBackPalette): void {
  const colors = { o: palette.ink, a: palette.accent, h: palette.glow };
  const size = spriteSize(MINI_HEART);
  const inset = 7;
  for (const [x, y] of [
    [inset, inset],
    [p.cols - inset - size.w, inset],
    [inset, p.rows - inset - size.h],
    [p.cols - inset - size.w, p.rows - inset - size.h],
  ] as const) {
    p.sprite(MINI_HEART, x, y, colors);
  }
}

export const paintPixelBack: CardBackPainter = (ctx, { w, h }, palette) => {
  paintPixelArt(ctx, w, h, PIXEL_GRID_COLS, (p) => {
    drawSky(p, palette);
    const cx = Math.floor(p.cols / 2);
    const cy = Math.floor(p.rows / 2);
    drawDiamond(p, palette, cx, cy);

    const hat = spriteSize(WIZARD_HAT, 2);
    const hatColors = { o: palette.ink, h: mixColor(palette.base, 'white', 0.3), s: palette.metal, b: palette.accent };
    p.sprite(WIZARD_HAT, cx - Math.round(hat.w / 2) + 1, cy - Math.round(hat.h / 2) - 2, hatColors, { scale: 2 });
    p.sprite(SPARKLE, cx - 14, cy - 10, { a: palette.metalShade, h: palette.glow });
    p.sprite(SPARKLE, cx + 9, cy + 4, { a: palette.metalShade, h: palette.glow });

    drawSteppedFrame(p, {
      ink: palette.ink,
      metal: palette.metal,
      metalShade: palette.metalShade,
      light: mixColor(palette.metal, 'white', 0.55),
    });
    drawBulbs(p, palette);
    drawCornerHearts(p, palette);
    drawBanner(p, palette);
  });
};
