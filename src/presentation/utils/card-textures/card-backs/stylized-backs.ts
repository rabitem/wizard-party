'use client';

/** Manga (bold ink, speed lines, halftone) and Hyperreal (embossed leather, gold foil) card backs */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { createSeededRandom, drawStar } from '../drawing-utils';
import {
  TAU,
  drawVignette,
  fillRadialBackground,
  forEachCorner,
  getBackCenter,
  getMedallionRadius,
  type BackSize,
  type CardBackPainter,
} from './back-shared';

const MANGA_HALFTONE_STEP = 14;
const MANGA_SPEED_LINES = 72;
const HYPERREAL_GRAIN_DOTS = 700;
const HYPERREAL_STITCH_DASH: [number, number] = [10, 7];

function drawHalftone(ctx: CanvasRenderingContext2D, { w, h }: BackSize, color: string): void {
  // Dots grow toward the corners, like screentone fading out of a panel
  ctx.fillStyle = color;
  const maxDist = Math.hypot(w / 2, h / 2);
  for (let y = MANGA_HALFTONE_STEP / 2; y < h; y += MANGA_HALFTONE_STEP) {
    for (let x = MANGA_HALFTONE_STEP / 2; x < w; x += MANGA_HALFTONE_STEP) {
      const t = Math.hypot(x - w / 2, y - h / 2) / maxDist;
      if (t < 0.55) continue;
      const r = ((t - 0.55) / 0.45) * MANGA_HALFTONE_STEP * 0.48;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, size: BackSize, color: string, clearRadius: number): void {
  const random = createSeededRandom('card-back:manga-speed');
  const { x, y } = getBackCenter(size);
  const outer = Math.hypot(size.w, size.h);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < MANGA_SPEED_LINES; i++) {
    const a = (i / MANGA_SPEED_LINES) * TAU + random() * 0.05;
    const spread = 0.008 + random() * 0.018;
    const start = clearRadius + random() * clearRadius * 0.8;
    ctx.moveTo(x + Math.cos(a) * start, y + Math.sin(a) * start);
    ctx.lineTo(x + Math.cos(a - spread) * outer, y + Math.sin(a - spread) * outer);
    ctx.lineTo(x + Math.cos(a + spread) * outer, y + Math.sin(a + spread) * outer);
    ctx.closePath();
  }
  ctx.fill();
}

export const paintMangaBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, w, h);

  const center = getBackCenter(size);
  const r = getMedallionRadius(size);
  drawSpeedLines(ctx, size, palette.ink, r * 1.05);
  drawHalftone(ctx, size, palette.metalShade);

  // Comic burst medallion: spot-colour burst, inked star, highlight
  ctx.fillStyle = palette.accent;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.74;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const px = center.x + Math.cos(a) * rr;
    const py = center.y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r * 0.6, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.ink;
  drawStar(ctx, center.x, center.y, r * 0.48, 5);
  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.ellipse(center.x - r * 0.12, center.y - r * 0.2, r * 0.07, r * 0.04, -0.6, 0, TAU);
  ctx.fill();
  ctx.lineJoin = 'miter';

  // Bold double panel border
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  // Inked corner triangles with a spot-colour stripe
  forEachCorner(size, (corner, i) => {
    const dx = i % 2 === 0 ? 1 : -1;
    const dy = i < 2 ? 1 : -1;
    const ox = corner.x - dx * 26;
    const oy = corner.y - dy * 26;
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + dx * 48, oy);
    ctx.lineTo(ox, oy + dy * 48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox + dx * 30, oy + dy * 4);
    ctx.lineTo(ox + dx * 4, oy + dy * 30);
    ctx.stroke();
  }, 54);
};

function createFoilGradient(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette): CanvasGradient {
  const foil = ctx.createLinearGradient(0, 0, w, h);
  foil.addColorStop(0, palette.metalShade);
  foil.addColorStop(0.3, palette.metal);
  foil.addColorStop(0.5, palette.accent);
  foil.addColorStop(0.7, palette.metal);
  foil.addColorStop(1, palette.metalShade);
  return foil;
}

/** Draws a rectangle twice: dark offset for depth, then foil on top (embossed look) */
function strokeEmbossedRect(ctx: CanvasRenderingContext2D, inset: number, size: BackSize, foil: CanvasGradient, lineWidth: number): void {
  const { w, h } = size;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(inset + 2, inset + 2, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = foil;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

export const paintHyperrealBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  const random = createSeededRandom('card-back:hyperreal');
  fillRadialBackground(ctx, size, palette.base, palette.deep, { x: w * 0.42, y: h * 0.38 });

  // Leather grain
  for (let i = 0; i < HYPERREAL_GRAIN_DOTS; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,240,220,0.05)' : 'rgba(0,0,0,0.08)';
    const s = 1 + random() * 2.5;
    ctx.fillRect(random() * w, random() * h, s, s);
  }

  // Stitching just inside the edge
  ctx.strokeStyle = palette.metalShade;
  ctx.lineWidth = 2;
  ctx.setLineDash(HYPERREAL_STITCH_DASH);
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.setLineDash([]);

  const foil = createFoilGradient(ctx, size, palette);
  strokeEmbossedRect(ctx, 34, size, foil, 6);
  strokeEmbossedRect(ctx, 46, size, foil, 2);

  // Embossed medallion: drop shadow, foil ring, leather inset, foil star
  const center = getBackCenter(size);
  const r = getMedallionRadius(size);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(center.x + 4, center.y + 6, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = foil;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, TAU);
  ctx.fill();
  const inset = ctx.createRadialGradient(center.x, center.y - r * 0.4, 0, center.x, center.y, r * 0.86);
  inset.addColorStop(0, palette.base);
  inset.addColorStop(1, palette.deep);
  ctx.fillStyle = inset;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r * 0.86, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  drawStar(ctx, center.x + 3, center.y + 4, r * 0.68, 8);
  ctx.fillStyle = foil;
  drawStar(ctx, center.x, center.y, r * 0.68, 8);
  ctx.fillStyle = palette.deep;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = foil;
  drawStar(ctx, center.x, center.y, r * 0.12, 4);

  // Specular sheen across the upper half
  const sheen = ctx.createLinearGradient(0, 0, w, h * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // Filigree corner brackets with foil diamonds
  forEachCorner(size, (corner, i) => {
    const dx = i % 2 === 0 ? 1 : -1;
    const dy = i < 2 ? 1 : -1;
    ctx.strokeStyle = foil;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(corner.x, corner.y + dy * 40);
    ctx.quadraticCurveTo(corner.x, corner.y, corner.x + dx * 40, corner.y);
    ctx.stroke();
    ctx.fillStyle = foil;
    ctx.beginPath();
    ctx.moveTo(corner.x + dx * 10, corner.y + dy * 2);
    ctx.lineTo(corner.x + dx * 18, corner.y + dy * 10);
    ctx.lineTo(corner.x + dx * 10, corner.y + dy * 18);
    ctx.lineTo(corner.x + dx * 2, corner.y + dy * 10);
    ctx.closePath();
    ctx.fill();
  }, 62);

  drawVignette(ctx, size, 0.5);
};
