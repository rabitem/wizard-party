'use client';

/**
 * Building blocks shared by the card back painters: backgrounds, medallions,
 * frames and corner placement. All coordinates are in canvas pixels.
 */

import type { CardBackPalette } from '@/presentation/components/settings/card-back-presets';
import { drawOrnateFrame } from '../drawing-utils';
import type { Point } from './motif-primitives';

export const TAU = Math.PI * 2;

export interface BackSize {
  w: number;
  h: number;
}

/** Paints one card back onto a canvas of the given size */
export type CardBackPainter = (ctx: CanvasRenderingContext2D, size: BackSize, palette: CardBackPalette) => void;

/** Inset of corner motifs from the card edge */
export const BACK_CORNER_INSET = 54;
/** Medallion radius as a fraction of the card width */
export const BACK_MEDALLION_RATIO = 0.29;

export function getBackCenter({ w, h }: BackSize): Point {
  return { x: w / 2, y: h / 2 };
}

export function getMedallionRadius({ w }: BackSize): number {
  return w * BACK_MEDALLION_RATIO;
}

export function getBackCorners({ w, h }: BackSize, inset = BACK_CORNER_INSET): Point[] {
  return [
    { x: inset, y: inset },
    { x: w - inset, y: inset },
    { x: inset, y: h - inset },
    { x: w - inset, y: h - inset },
  ];
}

export function fillRadialBackground(ctx: CanvasRenderingContext2D, { w, h }: BackSize, inner: string, outer: string, focus?: Point): void {
  const fx = focus?.x ?? w / 2;
  const fy = focus?.y ?? h / 2;
  const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, h / 1.2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function fillLinearBackground(ctx: CanvasRenderingContext2D, { w, h }: BackSize, stops: string[]): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((color, i) => grad.addColorStop(i / Math.max(stops.length - 1, 1), color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Darkens the card edges so the centre reads as lit */
export function drawVignette(ctx: CanvasRenderingContext2D, { w, h }: BackSize, strength: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Round medallion: filled disc, double metal ring and a ring of tick marks.
 * Returns the inner radius available for the medallion motif.
 */
export function drawMedallion(
  ctx: CanvasRenderingContext2D,
  center: Point,
  r: number,
  colors: { fillInner: string; fillOuter: string; metal: string; shade: string }
): number {
  const { x, y } = center;
  const disc = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
  disc.addColorStop(0, colors.fillInner);
  disc.addColorStop(1, colors.fillOuter);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = colors.metal;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = colors.shade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r - 9, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = colors.metal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const ticks = 32;
  for (let i = 0; i < ticks; i++) {
    const a = (i * TAU) / ticks;
    const outer = r - 12;
    const inner = i % 2 === 0 ? r - 22 : r - 17;
    ctx.moveTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
    ctx.lineTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
  }
  ctx.stroke();
  return r - 26;
}

/** Classic ornate frame plus a thin inner line and diamond accents at the side midpoints */
export function drawSeasonalFrame(ctx: CanvasRenderingContext2D, { w, h }: BackSize, palette: CardBackPalette): void {
  drawOrnateFrame(ctx, w, h, palette.metal, palette.metalShade);
  ctx.strokeStyle = palette.metal;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, w - 64, h - 64);
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.metal;
  for (const p of [{ x: w / 2, y: 18 }, { x: w / 2, y: h - 18 }, { x: 18, y: h / 2 }, { x: w - 18, y: h / 2 }]) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 9);
    ctx.lineTo(p.x + 9, p.y);
    ctx.lineTo(p.x, p.y + 9);
    ctx.lineTo(p.x - 9, p.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Calls draw once per corner (TL, TR, BL, BR) at the given inset */
export function forEachCorner(size: BackSize, draw: (corner: Point, index: number) => void, inset = BACK_CORNER_INSET): void {
  getBackCorners(size, inset).forEach((corner, index) => draw(corner, index));
}
