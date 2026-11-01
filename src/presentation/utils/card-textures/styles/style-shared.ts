'use client';

/**
 * Helpers shared by the non-classic card art styles (manga, hyperreal):
 * colour math, corner layout and mirrored corner drawing.
 */

import type { CardNumberFontSizes } from '../numbered-card-drawing';

export interface CornerLayout {
  /** Radius of the corner badge behind the number */
  radius: number;
  x: number;
  y: number;
}

/** Same corner placement as the classic number card, so hit areas line up */
export function getCornerLayout(value: number, fontSizes: CardNumberFontSizes): CornerLayout {
  const radius = fontSizes.corner * 0.6;
  return {
    radius,
    x: Math.max(radius + 35, value >= 10 ? 100 : 80),
    y: radius + 40,
  };
}

/** Draws at the top-left corner, then again rotated 180 degrees at the bottom-right */
export function drawMirroredCorners(
  ctx: CanvasRenderingContext2D,
  { w, h }: CardSize,
  { x, y }: Point,
  draw: () => void
): void {
  ctx.save();
  ctx.translate(x, y);
  draw();
  ctx.restore();

  ctx.save();
  ctx.translate(w - x, h - y);
  ctx.rotate(Math.PI);
  draw();
  ctx.restore();
}

export interface CardSize {
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface StarShape extends Point {
  outer: number;
  inner: number;
  points: number;
}

type Rgb = [number, number, number];

function parseHexColor(hex: string): Rgb {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes a hex colour towards black or white by `amount` (0..1) */
export function mixColor(hex: string, target: 'black' | 'white', amount: number): string {
  const t = target === 'white' ? 255 : 0;
  const [r, g, b] = parseHexColor(hex).map((c) => Math.round(c + (t - c) * amount));
  return `rgb(${r},${g},${b})`;
}

/** Hex colour with alpha */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHexColor(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function resetShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Path for a star with a configurable inner radius (does not fill/stroke) */
export function starPath(ctx: CanvasRenderingContext2D, star: StarShape): void {
  const { x: cx, y: cy, outer, inner, points } = star;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Blends two hex colours (amount 0 = `from`, 1 = `to`) and returns hex, so the result can be mixed again */
export function blendHex(from: string, to: string, amount: number): string {
  const a = parseHexColor(from);
  const b = parseHexColor(to);
  return `#${a.map((c, i) => Math.round(c + (b[i] - c) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** Perceived brightness of a hex colour (0 = black, 1 = white) */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Average glyph advance in em, used when the context cannot measure text (tests, SSR) */
const FALLBACK_GLYPH_EM = 0.62;

/** Text width in pixels for `font` at `size`; estimates when measureText is unavailable */
export function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, font: string, size: number): number {
  ctx.font = font;
  const width = ctx.measureText?.(text)?.width;
  return typeof width === 'number' && width > 0 ? width : text.length * size * FALLBACK_GLYPH_EM;
}

/** Largest font size up to `base` at which `text` fits `maxWidth` */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  base: number,
  maxWidth: number
): number {
  const width = measureTextWidth(ctx, text, font(base), base);
  return width <= maxWidth ? base : Math.floor((base * maxWidth) / width);
}
