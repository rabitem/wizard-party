'use client';

/**
 * Unit space, pen and path helpers shared by the special-card emblem painters.
 */

import { starPath, type Point } from '../styles/style-shared';
import type { EmblemPalette } from './special-card-palettes';

/** Radius of the unit space the painters draw in */
export const EMBLEM_UNIT = 100;
export const TAU = Math.PI * 2;

export interface EmblemFrame extends Point {
  /** Radius of the circle the emblem fits in, in card pixels */
  size: number;
}

export interface EmblemPen {
  palette: EmblemPalette;
  /** Ink outline width in card pixels (0 = no outlines) */
  outline: number;
}

/** What a painter receives: the context in unit space and the outline width in unit space */
export interface Brush {
  ctx: CanvasRenderingContext2D;
  c: EmblemPalette;
  outline: number;
}

export type EmblemPainter = (brush: Brush) => void;

// ============== BRUSH HELPERS ==============

/** Fills the current path, then outlines it in ink */
export function fillInked(b: Brush, color: string): void {
  b.ctx.fillStyle = color;
  b.ctx.fill();
  if (b.outline <= 0) return;
  b.ctx.strokeStyle = b.c.ink;
  b.ctx.lineWidth = b.outline;
  b.ctx.stroke();
}

/** Outline first, fill on top: only the outer silhouette of a compound path gets ink */
export function fillSilhouette(b: Brush, color: string): void {
  if (b.outline > 0) {
    b.ctx.strokeStyle = b.c.ink;
    b.ctx.lineWidth = b.outline * 2;
    b.ctx.stroke();
  }
  b.ctx.fillStyle = color;
  b.ctx.fill();
}

export function strokeLine(b: Brush, color: string, width: number): void {
  b.ctx.strokeStyle = color;
  b.ctx.lineWidth = width;
  b.ctx.stroke();
}

/** Thick stroke with an ink casing (tails, fuses, limbs) */
export function strokeCased(b: Brush, color: string, width: number): void {
  if (b.outline > 0) strokeLine(b, b.c.ink, width + b.outline * 2);
  strokeLine(b, color, width);
}

export function circlePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export function ellipsePath(ctx: CanvasRenderingContext2D, { x, y }: Point, rx: number, ry: number, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
}

export function polygonPath(ctx: CanvasRenderingContext2D, points: ReadonlyArray<readonly [number, number]>): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Raindrop / blood drop with the point at the top */
export function dropPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.bezierCurveTo(x + r, y - r * 0.2, x + r, y + r, x, y + r);
  ctx.bezierCurveTo(x - r, y + r, x - r, y - r * 0.2, x, y - r * 1.4);
  ctx.closePath();
}

/** Draws once, then again mirrored across the vertical axis */
export function mirrored(ctx: CanvasRenderingContext2D, draw: () => void): void {
  draw();
  ctx.save();
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

/** Fills a set of small four-point twinkles */
export function twinkles(b: Brush, color: string, points: ReadonlyArray<readonly [number, number, number]>): void {
  for (const [x, y, r] of points) {
    starPath(b.ctx, { x, y, outer: r, inner: r * 0.3, points: 4 });
    b.ctx.fillStyle = color;
    b.ctx.fill();
  }
}
