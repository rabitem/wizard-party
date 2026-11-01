'use client';

/**
 * Celestial Tarot card back: a midnight star field with faint constellations,
 * a gilded frame, a zodiac wheel medallion holding a radiant sun-and-crescent,
 * moon-phase rows above and below (point-symmetric like a real tarot back)
 * and four-point stars in the corners. Deterministic (seeded stars).
 */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { createSeededRandom } from '../drawing-utils';
import { createFoilGradient, diagonalAxis } from '../styles/hyperreal-primitives';
import { starPath, withAlpha } from '../styles/style-shared';
import { drawEmblem, drawNightField } from '../styles/tarot-primitives';
import {
  TAU,
  drawSeasonalFrame,
  drawVignette,
  forEachCorner,
  getBackCenter,
  getMedallionRadius,
  type BackSize,
  type CardBackPainter,
} from './back-shared';
import type { Point } from './motif-primitives';

const ZODIAC_SECTORS = 12;
const MOON_PHASES = 5;

function foil(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, metal: string): CanvasGradient {
  return createFoilGradient(ctx, diagonalAxis(x, y, r), metal);
}

/** A few faint constellation stick figures scattered over the field */
function drawConstellations(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette, random: () => number): void {
  ctx.strokeStyle = withAlpha(palette.accent, 0.28);
  ctx.lineWidth = 1;
  for (const [fx, fy] of [[0.24, 0.2], [0.76, 0.8], [0.78, 0.24], [0.22, 0.78]]) {
    const points: Point[] = Array.from({ length: 4 }, () => ({
      x: w * fx + (random() - 0.5) * 90,
      y: h * fy + (random() - 0.5) * 70,
    }));
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.fillStyle = withAlpha(palette.glow, 0.85);
    for (const p of points) {
      starPath(ctx, { x: p.x, y: p.y, outer: 4.5, inner: 1.2, points: 4 });
      ctx.fill();
    }
  }
}

/** Zodiac wheel: double foil rings, twelve sectors and a star in each */
function drawZodiacWheel(ctx: CanvasRenderingContext2D, center: Point, r: number, palette: CardBackPalette): number {
  const { x, y } = center;
  const disc = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
  disc.addColorStop(0, palette.base);
  disc.addColorStop(1, palette.deep);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  const band = r * 0.2;
  ctx.strokeStyle = foil(ctx, center, r, palette.metal);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r - band, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = withAlpha(palette.metal, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < ZODIAC_SECTORS; i++) {
    const a = (i / ZODIAC_SECTORS) * TAU;
    ctx.moveTo(x + Math.cos(a) * (r - band), y + Math.sin(a) * (r - band));
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();

  for (let i = 0; i < ZODIAC_SECTORS; i++) {
    const a = ((i + 0.5) / ZODIAC_SECTORS) * TAU;
    const p = { x: x + Math.cos(a) * (r - band / 2), y: y + Math.sin(a) * (r - band / 2) };
    ctx.fillStyle = i % 3 === 0 ? palette.glow : palette.metal;
    starPath(ctx, { x: p.x, y: p.y, outer: band * (i % 3 === 0 ? 0.36 : 0.24), inner: band * 0.08, points: 4 });
    ctx.fill();
  }
  return r - band - 6;
}

/** Radiant sun with a crescent moon tucked against it */
function drawSunAndCrescent(ctx: CanvasRenderingContext2D, center: Point, r: number, palette: CardBackPalette): void {
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, r);
  glow.addColorStop(0, withAlpha(palette.glow, 0.45));
  glow.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, TAU);
  ctx.fill();

  drawEmblem(ctx, 'sun', center, r * 0.9, foil(ctx, center, r, palette.metal));
  // Face disc in the deep colour so the crescent reads against it
  ctx.fillStyle = palette.deep;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r * 0.4, 0, TAU);
  ctx.fill();
  drawEmblem(ctx, 'moon', center, r * 0.46, foil(ctx, center, r * 0.46, palette.accent));
  ctx.fillStyle = palette.glow;
  starPath(ctx, { x: center.x + r * 0.16, y: center.y - r * 0.02, outer: r * 0.1, inner: r * 0.03, points: 4 });
  ctx.fill();
}

/** Row of moon phases (new to full to new), drawn as shaded discs */
function drawMoonPhaseRow(ctx: CanvasRenderingContext2D, center: Point, spacing: number, r: number, palette: CardBackPalette): void {
  for (let i = 0; i < MOON_PHASES; i++) {
    const x = center.x + (i - (MOON_PHASES - 1) / 2) * spacing;
    const d = (i / (MOON_PHASES - 1) - 0.5) * 2; // -1 .. 1, 0 = full moon
    ctx.fillStyle = withAlpha(palette.metal, 0.25);
    ctx.beginPath();
    ctx.arc(x, center.y, r, 0, TAU);
    ctx.fill();
    // Lit disc minus a shifted shadow disc: thin crescents at the ends, full in the middle
    const offset = d === 0 ? 0 : Math.sign(d) * r * (0.4 + 1.8 * (1 - Math.abs(d)));
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, center.y, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = foil(ctx, { x, y: center.y }, r, palette.metal);
    ctx.fill();
    if (Math.abs(offset) > 0.01) {
      ctx.fillStyle = palette.deep;
      ctx.beginPath();
      ctx.arc(x + offset, center.y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export const paintTarotBack: CardBackPainter = (ctx, size, palette) => {
  const random = createSeededRandom('tarot-back');
  drawNightField(ctx, size, { base: palette.deep, light: palette.base, nebula: palette.accent }, random);
  drawConstellations(ctx, size, palette, random);
  drawVignette(ctx, size, 0.35);
  drawSeasonalFrame(ctx, size, palette);

  const center = getBackCenter(size);
  const inner = drawZodiacWheel(ctx, center, getMedallionRadius(size) * 1.12, palette);
  drawSunAndCrescent(ctx, center, inner, palette);

  // Point-symmetric moon phase rows and gilded rules above and below the wheel
  const rowOffset = size.h * 0.32;
  for (const dir of [-1, 1]) {
    const rowCenter = { x: center.x, y: center.y + dir * rowOffset };
    drawMoonPhaseRow(ctx, rowCenter, 46, 12, palette);
    ctx.strokeStyle = withAlpha(palette.metal, 0.6);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(center.x - 130, rowCenter.y - dir * 30);
    ctx.lineTo(center.x + 130, rowCenter.y - dir * 30);
    ctx.stroke();
  }

  forEachCorner(size, (corner) => {
    starPath(ctx, { x: corner.x, y: corner.y, outer: 16, inner: 4, points: 4 });
    ctx.fillStyle = foil(ctx, corner, 16, palette.metal);
    ctx.fill();
    ctx.fillStyle = palette.glow;
    starPath(ctx, { x: corner.x, y: corner.y, outer: 6, inner: 1.5, points: 4 });
    ctx.fill();
  });
};
