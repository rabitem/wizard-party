'use client';

/**
 * Drawing primitives for the Neon card art style: layered glow strokes (wide
 * soft halo, coloured tube, hot white core), dark glass backdrops with a
 * synthwave floor grid, neon frames and sign-style title plates.
 */

import { mixColor, resetShadow, withAlpha, type CardSize } from './style-shared';
import { fillSymbolText, strokeSymbolText } from '../suit-glyphs';

export const NEON_FONT = '"Arial Black", "Segoe UI Black", Arial, sans-serif';

export interface NeonColors {
  /** Darkest glass tone */
  body: string;
  /** Lighter glass tone / panel */
  panel: string;
  /** Tube colour */
  neon: string;
  /** Pale glow tint for secondary lines */
  glow: string;
}

const HALO = { WIDTH: 2.6, BLUR: 26, ALPHA: 0.35 } as const;
const TUBE_BLUR = 12;
const CORE = { WIDTH: 0.38, WHITEN: 0.72 } as const;
const FRAME = { INSET: 22, INNER: 38, RADIUS: 30 } as const;
const GRID = { HORIZON: 0.66, LINES: 7, RAYS: 9, ALPHA: 0.22 } as const;
const SHEEN_ALPHA = 0.07;

/** Strokes the current path three times: soft halo, coloured tube, white-hot core. */
export function strokeNeonPath(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(color, HALO.ALPHA);
  ctx.shadowColor = color;
  ctx.shadowBlur = HALO.BLUR;
  ctx.lineWidth = width * HALO.WIDTH;
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.shadowBlur = TUBE_BLUR;
  ctx.lineWidth = width;
  ctx.stroke();

  resetShadow(ctx);
  ctx.strokeStyle = mixColor(color, 'white', CORE.WHITEN);
  ctx.lineWidth = Math.max(1, width * CORE.WIDTH);
  ctx.stroke();
  ctx.restore();
}

export interface NeonTextOptions {
  font: string;
  color: string;
  /** Tube width of the outline */
  width: number;
  /** Optional solid fill drawn under the outline (glowing numerals) */
  fill?: string;
}

/** Neon text: optional glowing fill, then a three-pass outline like a bent glass tube. */
export function drawNeonText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: NeonTextOptions): void {
  const { font, color, width, fill } = options;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  if (fill) {
    ctx.shadowColor = color;
    ctx.shadowBlur = HALO.BLUR;
    ctx.fillStyle = fill;
    fillSymbolText(ctx, text, x, y);
  }

  ctx.strokeStyle = withAlpha(color, HALO.ALPHA);
  ctx.shadowColor = color;
  ctx.shadowBlur = HALO.BLUR;
  ctx.lineWidth = width * HALO.WIDTH;
  strokeSymbolText(ctx, text, x, y);

  ctx.strokeStyle = color;
  ctx.shadowBlur = TUBE_BLUR;
  ctx.lineWidth = width;
  strokeSymbolText(ctx, text, x, y);

  resetShadow(ctx);
  ctx.strokeStyle = mixColor(color, 'white', CORE.WHITEN);
  ctx.lineWidth = Math.max(1, width * CORE.WIDTH);
  strokeSymbolText(ctx, text, x, y);
  ctx.restore();
}

export interface RoundedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export function roundedRectPath(ctx: CanvasRenderingContext2D, { x, y, w, h, r }: RoundedRect): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Perspective floor grid below a horizon line, fading towards the horizon. */
function drawFloorGrid(ctx: CanvasRenderingContext2D, { w, h }: CardSize, color: string): void {
  const horizon = h * GRID.HORIZON;
  const depth = h - horizon;
  const fade = ctx.createLinearGradient(0, horizon, 0, h);
  fade.addColorStop(0, withAlpha(color, 0));
  fade.addColorStop(1, withAlpha(color, GRID.ALPHA));
  ctx.save();
  ctx.strokeStyle = fade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i <= GRID.LINES; i++) {
    const t = i / GRID.LINES;
    const y = horizon + depth * t * t;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let i = 0; i < GRID.RAYS; i++) {
    const t = i / (GRID.RAYS - 1);
    ctx.moveTo(w / 2 + (t - 0.5) * w * 0.25, horizon);
    ctx.lineTo(w / 2 + (t - 0.5) * w * 2.4, h);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Dark glass card body: vertical body/panel gradient, a coloured bloom behind
 * the emblem, the synthwave floor grid and a diagonal glass sheen.
 */
export function drawNeonBackdrop(ctx: CanvasRenderingContext2D, size: CardSize, colors: NeonColors, focusY: number): void {
  const { w, h } = size;
  const body = ctx.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, colors.body);
  body.addColorStop(0.5, colors.panel);
  body.addColorStop(1, colors.body);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, w, h);

  const bloom = ctx.createRadialGradient(w / 2, focusY, 10, w / 2, focusY, w * 0.62);
  bloom.addColorStop(0, withAlpha(colors.neon, 0.26));
  bloom.addColorStop(1, withAlpha(colors.neon, 0));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  drawFloorGrid(ctx, size, colors.neon);

  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.36, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.42, `rgba(255,255,255,${SHEEN_ALPHA})`);
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
}

/** Rounded neon tube frame with a thin pale inner line and corner ticks. */
export function drawNeonFrame(ctx: CanvasRenderingContext2D, { w, h }: CardSize, colors: NeonColors): void {
  roundedRectPath(ctx, { x: FRAME.INSET, y: FRAME.INSET, w: w - FRAME.INSET * 2, h: h - FRAME.INSET * 2, r: FRAME.RADIUS });
  strokeNeonPath(ctx, colors.neon, 5);

  ctx.save();
  ctx.strokeStyle = withAlpha(colors.glow, 0.45);
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, { x: FRAME.INNER, y: FRAME.INNER, w: w - FRAME.INNER * 2, h: h - FRAME.INNER * 2, r: FRAME.RADIUS * 0.6 });
  ctx.stroke();
  ctx.restore();
}

/** Sign-style title: dark glass plate with a neon outline and glowing lettering. */
export function drawNeonTitle(ctx: CanvasRenderingContext2D, { w, h }: CardSize, text: string, colors: NeonColors, fontSize = 34): void {
  const plateW = Math.min(w - 120, Math.max(200, text.length * fontSize * 0.86 + 60));
  const plateH = fontSize * 1.7;
  const x = (w - plateW) / 2;
  const y = h - 100 - plateH / 2;
  roundedRectPath(ctx, { x, y, w: plateW, h: plateH, r: plateH / 2 });
  ctx.fillStyle = withAlpha(colors.body, 0.85);
  ctx.fill();
  strokeNeonPath(ctx, colors.neon, 3);
  drawNeonText(ctx, text, w / 2, h - 100, {
    font: `italic ${fontSize}px ${NEON_FONT}`,
    color: colors.neon,
    width: 2,
    fill: mixColor(colors.glow, 'white', 0.4),
  });
}

/** Ring of dashed neon arcs around the emblem. */
export interface NeonRing {
  cx: number;
  cy: number;
  r: number;
  segments?: number;
}

export function drawNeonRing(ctx: CanvasRenderingContext2D, { cx, cy, r, segments = 12 }: NeonRing, colors: NeonColors): void {
  const gap = 0.12;
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2 + gap;
    const a1 = ((i + 1) / segments) * Math.PI * 2 - gap;
    ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.arc(cx, cy, r, a0, a1);
  }
  strokeNeonPath(ctx, colors.glow, 3);

  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
  strokeNeonPath(ctx, colors.neon, 4);
}

/** Four-point sparkle path (a neon twinkle). */
export function sparklePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
}
