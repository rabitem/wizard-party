'use client';

/**
 * Solarpunk card back: deep moss field with a faint solar-cell hex lattice,
 * leafy vines winding round a fine brass frame, riveted brass corner
 * brackets, brass sun studs top and bottom, and a sun-ray medallion
 * holding a veined sprout with two seed leaves.
 */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { drawVeinedLeaf } from '../styles/solarpunk-primitives';
import { mixColor, withAlpha } from '../styles/style-shared';
import { TAU, drawVignette, fillRadialBackground, getBackCenter, getMedallionRadius, type BackSize, type CardBackPainter } from './back-shared';

const FRAME_INSET = 30;
const BRACKET = 46;
const HEX_SIZE = 26;
const VINE_WAVE = 9;
const VINE_STEP = 30;
const SUN_RAYS = 28;

/** Faint honeycomb of solar cells across the field */
function drawHexLattice(ctx: CanvasRenderingContext2D, { w, h }: BackSize, color: string): void {
  const dx = HEX_SIZE * Math.sqrt(3);
  const dy = HEX_SIZE * 1.5;
  ctx.beginPath();
  for (let row = -1; row * dy < h + HEX_SIZE; row++) {
    for (let col = -1; col * dx < w + dx; col++) {
      const cx = col * dx + (row % 2 === 0 ? 0 : dx / 2);
      const cy = row * dy;
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI / 6 + (i * TAU) / 6;
        const px = cx + Math.cos(a) * HEX_SIZE;
        const py = cy + Math.sin(a) * HEX_SIZE;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** One straight run of wavy vine with alternating veined leaves */
function drawVineRun(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], palette: CardBackPalette): void {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / length;
  const uy = (y1 - y0) / length;
  const steps = Math.floor(length / VINE_STEP);
  const point = (t: number): [number, number] => {
    const wave = Math.sin(t * Math.PI * 2) * VINE_WAVE;
    return [x0 + ux * t * VINE_STEP - uy * wave, y0 + uy * t * VINE_STEP + ux * wave];
  };

  ctx.beginPath();
  ctx.moveTo(...point(0));
  for (let i = 1; i <= steps * 4; i++) ctx.lineTo(...point(i / 4));
  ctx.strokeStyle = mixColor(palette.accent, 'black', 0.25);
  ctx.lineWidth = 2;
  ctx.stroke();

  const along = Math.atan2(uy, ux);
  for (let i = 0; i < steps; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const [px, py] = point(i + 0.25 + (side > 0 ? 0 : 0.5));
    drawVeinedLeaf(ctx, { x: px, y: py }, { length: 20, width: 7, angle: along + side * 0.9 }, { fill: withAlpha(palette.accent, 0.75), ink: mixColor(palette.accent, 'black', 0.45) }, 1.2);
  }
}

/** Brass frame line with vines running clockwise along every side */
function drawVineFrame(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette): void {
  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(FRAME_INSET, FRAME_INSET, w - FRAME_INSET * 2, h - FRAME_INSET * 2);
  ctx.strokeStyle = withAlpha(palette.metal, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(FRAME_INSET + 10, FRAME_INSET + 10, w - FRAME_INSET * 2 - 20, h - FRAME_INSET * 2 - 20);

  const a = FRAME_INSET + 5;
  const pad = BRACKET + 6;
  drawVineRun(ctx, [a + pad, a], [w - a - pad, a], palette);
  drawVineRun(ctx, [w - a, a + pad], [w - a, h - a - pad], palette);
  drawVineRun(ctx, [w - a - pad, h - a], [a + pad, h - a], palette);
  drawVineRun(ctx, [a, h - a - pad], [a, a + pad], palette);
}

/** Riveted brass L-brackets at the four corners */
function drawCornerBrackets(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette): void {
  const corners: Array<[number, number, number, number]> = [
    [18, 18, 1, 1],
    [w - 18, 18, -1, 1],
    [18, h - 18, 1, -1],
    [w - 18, h - 18, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    const grad = ctx.createLinearGradient(x, y, x + sx * BRACKET, y + sy * BRACKET);
    grad.addColorStop(0, mixColor(palette.metal, 'white', 0.45));
    grad.addColorStop(1, palette.metalShade);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sx * BRACKET, y);
    ctx.lineTo(x + sx * BRACKET, y + sy * 10);
    ctx.lineTo(x + sx * 10, y + sy * 10);
    ctx.lineTo(x + sx * 10, y + sy * BRACKET);
    ctx.lineTo(x, y + sy * BRACKET);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = palette.glow;
    for (const [rx, ry] of [[5, 5], [BRACKET - 7, 5], [5, BRACKET - 7]] as const) {
      ctx.beginPath();
      ctx.arc(x + sx * rx, y + sy * ry, 2.3, 0, TAU);
      ctx.fill();
    }
  }
}

/** Sun-ray ring, brass rings and a veined sprout with two seed leaves */
function drawSunMedallion(ctx: CanvasRenderingContext2D, size: BackSize, palette: CardBackPalette): void {
  const { x, y } = getBackCenter(size);
  const r = getMedallionRadius(size);

  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.7);
  halo.addColorStop(0, withAlpha(palette.glow, 0.35));
  halo.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);

  ctx.beginPath();
  for (let i = 0; i < SUN_RAYS; i++) {
    const a = (i * TAU) / SUN_RAYS;
    const half = Math.PI / SUN_RAYS;
    const tip = r * (i % 2 === 0 ? 1.45 : 1.25);
    ctx.moveTo(x + Math.cos(a - half) * r, y + Math.sin(a - half) * r);
    ctx.lineTo(x + Math.cos(a) * tip, y + Math.sin(a) * tip);
    ctx.lineTo(x + Math.cos(a + half) * r, y + Math.sin(a + half) * r);
  }
  ctx.fillStyle = palette.metal;
  ctx.fill();
  ctx.strokeStyle = palette.metalShade;
  ctx.lineWidth = 1;
  ctx.stroke();

  const disc = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  disc.addColorStop(0, mixColor(palette.base, 'white', 0.15));
  disc.addColorStop(1, palette.deep);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = withAlpha(palette.metal, 0.6);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r - 11, 0, TAU);
  ctx.stroke();

  const leafColors = { fill: palette.accent, ink: mixColor(palette.accent, 'black', 0.5) };
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.62);
  ctx.quadraticCurveTo(x + r * 0.08, y + r * 0.1, x, y - r * 0.1);
  ctx.stroke();
  drawVeinedLeaf(ctx, { x, y: y - r * 0.08 }, { length: r * 0.66, width: r * 0.26, angle: -Math.PI / 2 }, leafColors, 2.2);
  drawVeinedLeaf(ctx, { x, y: y + r * 0.2 }, { length: r * 0.48, width: r * 0.18, angle: -0.35 }, leafColors, 1.8);
  drawVeinedLeaf(ctx, { x, y: y + r * 0.2 }, { length: r * 0.48, width: r * 0.18, angle: Math.PI + 0.35 }, leafColors, 1.8);

  // Two brass seeds in the soil at the sprout's foot
  ctx.fillStyle = palette.metal;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.3, y + r * 0.62, r * 0.07, r * 0.045, side * 0.4, 0, TAU);
    ctx.fill();
  }
}

/** Small brass sun discs at the top and bottom centre of the field */
function drawSunStuds(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette): void {
  for (const y of [h * 0.14, h * 0.86]) {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      ctx.moveTo(w / 2 + Math.cos(a) * 12, y + Math.sin(a) * 12);
      ctx.lineTo(w / 2 + Math.cos(a) * 20, y + Math.sin(a) * 20);
    }
    ctx.strokeStyle = palette.metal;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, y, 9, 0, TAU);
    ctx.fillStyle = palette.metal;
    ctx.fill();
  }
}

export const paintSolarpunkBack: CardBackPainter = (ctx, size, palette) => {
  fillRadialBackground(ctx, size, palette.base, palette.deep);
  drawHexLattice(ctx, size, withAlpha(palette.glow, 0.07));
  drawVignette(ctx, size, 0.35);
  drawVineFrame(ctx, size, palette);
  drawCornerBrackets(ctx, size, palette);
  drawSunStuds(ctx, size, palette);
  drawSunMedallion(ctx, size, palette);
};
