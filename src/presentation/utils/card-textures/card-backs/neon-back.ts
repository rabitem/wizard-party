'use client';

/**
 * Neon Night card back: dark glass with a mirrored synthwave grid tunnel and
 * scanlines, a medallion holding a striped retro sun setting behind a city
 * skyline over a glowing grid, a double neon tube frame with corner brackets
 * and twinkling sparkles. Point-symmetric outside the medallion so the back
 * reads the same from either side of the table.
 */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { createSeededRandom } from '../drawing-utils';
import { roundedRectPath, sparklePath, strokeNeonPath } from '../styles/neon-primitives';
import { mixColor, withAlpha } from '../styles/style-shared';
import { TAU, fillRadialBackground, forEachCorner, getBackCenter, getMedallionRadius, type BackSize, type CardBackPainter } from './back-shared';
import type { Point } from './motif-primitives';

const TUNNEL = { LINES: 8, RAYS: 11, ALPHA: 0.2 } as const;
const SCANLINE = { STEP: 6, ALPHA: 0.16 } as const;
const FRAME = { OUTER: 24, INNER: 40, RADIUS: 28, BRACKET: 34 } as const;
const SUN = { RADIUS_RATIO: 0.56, LIFT_RATIO: 0.08, STRIPES: 5 } as const;
const SKYLINE = { BUILDINGS: 11, MIN_H: 0.12, MAX_H: 0.42, SEED: 'neon-back-skyline' } as const;
const MEDALLION_GRID = { LINES: 5, RAYS: 9 } as const;

/** Perspective grid running away from the centre line, mirrored top and bottom. */
function drawGridTunnel(ctx: CanvasRenderingContext2D, { w, h }: BackSize, color: string): void {
  const mid = h / 2;
  ctx.save();
  ctx.strokeStyle = withAlpha(color, TUNNEL.ALPHA);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const dir of [-1, 1]) {
    for (let i = 1; i <= TUNNEL.LINES; i++) {
      const t = i / TUNNEL.LINES;
      const y = mid + dir * mid * t * t;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    for (let i = 0; i < TUNNEL.RAYS; i++) {
      const t = i / (TUNNEL.RAYS - 1) - 0.5;
      ctx.moveTo(w / 2 + t * w * 0.2, mid);
      ctx.lineTo(w / 2 + t * w * 2.6, mid + dir * mid);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawScanlines(ctx: CanvasRenderingContext2D, { w, h }: BackSize): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${SCANLINE.ALPHA})`;
  ctx.beginPath();
  for (let y = 0; y < h; y += SCANLINE.STEP) ctx.rect(0, y, w, 2);
  ctx.fill();
  ctx.restore();
}

/** Striped retro sun, mini grid floor and a skyline silhouette, clipped to the medallion. */
function drawSunsetScene(ctx: CanvasRenderingContext2D, center: Point, r: number, palette: CardBackPalette): void {
  const { x, y } = center;
  const horizon = y + r * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, y - r, 0, horizon);
  sky.addColorStop(0, palette.deep);
  sky.addColorStop(1, mixColor(palette.accent, 'black', 0.55));
  ctx.fillStyle = sky;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const sunR = r * SUN.RADIUS_RATIO;
  const sunY = horizon - r * SUN.LIFT_RATIO;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, palette.glow);
  sun.addColorStop(0.45, mixColor(palette.accent, 'white', 0.25));
  sun.addColorStop(1, palette.accent);
  ctx.fillStyle = sun;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(x, sunY, sunR, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'rgba(0,0,0,0)';

  // Horizontal cuts through the lower half of the sun, widening downwards
  ctx.fillStyle = mixColor(palette.accent, 'black', 0.55);
  for (let i = 0; i < SUN.STRIPES; i++) {
    const t = i / SUN.STRIPES;
    ctx.fillRect(x - sunR, sunY + sunR * (0.1 + t * 0.8), sunR * 2, 2 + t * 7);
  }

  drawSkyline(ctx, { x, y: horizon }, r, palette.ink, palette.glow);

  ctx.fillStyle = palette.ink;
  ctx.fillRect(x - r, horizon, r * 2, r);
  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const depth = y + r - horizon;
  for (let i = 1; i <= MEDALLION_GRID.LINES; i++) {
    const t = i / MEDALLION_GRID.LINES;
    ctx.moveTo(x - r, horizon + depth * t * t);
    ctx.lineTo(x + r, horizon + depth * t * t);
  }
  for (let i = 0; i < MEDALLION_GRID.RAYS; i++) {
    const t = i / (MEDALLION_GRID.RAYS - 1) - 0.5;
    ctx.moveTo(x + t * r * 0.4, horizon);
    ctx.lineTo(x + t * r * 3.2, y + r);
  }
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(x - r, horizon);
  ctx.lineTo(x + r, horizon);
  strokeNeonPath(ctx, palette.accent, 2);
}

/** Seeded row of tower silhouettes standing on the horizon, with a few lit windows. */
function drawSkyline(ctx: CanvasRenderingContext2D, base: Point, r: number, ink: string, windowColor: string): void {
  const random = createSeededRandom(SKYLINE.SEED);
  const width = (r * 2) / SKYLINE.BUILDINGS;
  for (let i = 0; i < SKYLINE.BUILDINGS; i++) {
    const height = r * (SKYLINE.MIN_H + random() * (SKYLINE.MAX_H - SKYLINE.MIN_H));
    const left = base.x - r + i * width + width * 0.08;
    const bw = width * (0.75 + random() * 0.2);
    ctx.fillStyle = ink;
    ctx.fillRect(left, base.y - height, bw, height);
    ctx.fillStyle = withAlpha(windowColor, 0.75);
    for (let wy = base.y - height + 6; wy < base.y - 6; wy += 9) {
      if (random() > 0.55) ctx.fillRect(left + bw * 0.3, wy, 3, 3);
      if (random() > 0.7) ctx.fillRect(left + bw * 0.62, wy, 3, 3);
    }
  }
}

/** Double rounded tube frame, L brackets in the corners and side diamonds. */
function drawNeonBackFrame(ctx: CanvasRenderingContext2D, size: BackSize, palette: CardBackPalette): void {
  const { w, h } = size;
  roundedRectPath(ctx, { x: FRAME.OUTER, y: FRAME.OUTER, w: w - FRAME.OUTER * 2, h: h - FRAME.OUTER * 2, r: FRAME.RADIUS });
  strokeNeonPath(ctx, palette.accent, 5);
  roundedRectPath(ctx, { x: FRAME.INNER, y: FRAME.INNER, w: w - FRAME.INNER * 2, h: h - FRAME.INNER * 2, r: FRAME.RADIUS * 0.6 });
  strokeNeonPath(ctx, palette.metal, 2);

  const inset = FRAME.INNER + 14;
  forEachCorner(
    size,
    (corner) => {
      const sx = corner.x < w / 2 ? 1 : -1;
      const sy = corner.y < h / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(corner.x, corner.y + sy * FRAME.BRACKET);
      ctx.lineTo(corner.x, corner.y);
      ctx.lineTo(corner.x + sx * FRAME.BRACKET, corner.y);
      strokeNeonPath(ctx, palette.metal, 3);
      sparklePath(ctx, corner.x + sx * 22, corner.y + sy * 22, 7);
      strokeNeonPath(ctx, palette.glow, 1.5);
    },
    inset
  );

  for (const p of [{ x: w / 2, y: FRAME.OUTER }, { x: w / 2, y: h - FRAME.OUTER }]) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 10);
    ctx.lineTo(p.x + 14, p.y);
    ctx.lineTo(p.x, p.y + 10);
    ctx.lineTo(p.x - 14, p.y);
    ctx.closePath();
    ctx.fillStyle = palette.ink;
    ctx.fill();
    strokeNeonPath(ctx, palette.accent, 2.5);
  }
}

/** Dashed neon ring around the medallion plus an outer metal tube. */
function drawMedallionRings(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, palette: CardBackPalette): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  strokeNeonPath(ctx, palette.metal, 4);

  const segments = 24;
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU + 0.06;
    const a1 = ((i + 1) / segments) * TAU - 0.06;
    ctx.moveTo(x + Math.cos(a0) * (r + 14), y + Math.sin(a0) * (r + 14));
    ctx.arc(x, y, r + 14, a0, a1);
  }
  strokeNeonPath(ctx, palette.accent, 2.5);
}

export const paintNeonBack: CardBackPainter = (ctx, size, palette) => {
  fillRadialBackground(ctx, size, palette.base, palette.deep);
  drawGridTunnel(ctx, size, palette.metal);
  drawScanlines(ctx, size);

  const center = getBackCenter(size);
  const r = getMedallionRadius(size);
  drawSunsetScene(ctx, center, r, palette);
  drawMedallionRings(ctx, center, r, palette);
  drawNeonBackFrame(ctx, size, palette);
};
