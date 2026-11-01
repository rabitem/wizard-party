'use client';

/**
 * Manga drawing primitives: screentone halftone, speed lines, ink frames,
 * comic bursts and outlined comic lettering.
 */

import type { RandomSource } from '../drawing-utils';
import { starPath, type Point, type StarShape } from './style-shared';
import { fillSymbolText, strokeSymbolText } from '../suit-glyphs';

/** Inset of the inner panel edge (everything decorative is clipped to it) */
export const MANGA_PANEL_INSET = 28;
export const MANGA_COMIC_FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';

/**
 * Screentone: a grid of dots whose radius comes from `radiusAt`.
 * All dots go into one path so this stays cheap.
 */
export function drawHalftone(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; w: number; h: number },
  spacing: number,
  color: string,
  radiusAt: (px: number, py: number) => number
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let row = 0; row * spacing <= area.h; row++) {
    // Offset every other row for a classic 45-degree screen
    const shift = row % 2 === 0 ? 0 : spacing / 2;
    for (let col = 0; col * spacing <= area.w; col++) {
      const px = area.x + col * spacing + shift;
      const py = area.y + row * spacing;
      const r = radiusAt(px, py);
      if (r < 0.35) continue;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/** Radiating speed lines (thin wedges) around a focus point */
export interface SpeedLineConfig {
  innerRadius: number;
  outerRadius: number;
  count: number;
}

export function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  focus: Point,
  { innerRadius, outerRadius, count }: SpeedLineConfig,
  color: string,
  random: RandomSource
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.09;
    const spread = 0.004 + random() * 0.014;
    const start = innerRadius + random() * innerRadius * 0.45;
    ctx.moveTo(focus.x + Math.cos(angle) * start, focus.y + Math.sin(angle) * start);
    ctx.lineTo(focus.x + Math.cos(angle - spread) * outerRadius, focus.y + Math.sin(angle - spread) * outerRadius);
    ctx.lineTo(focus.x + Math.cos(angle + spread) * outerRadius, focus.y + Math.sin(angle + spread) * outerRadius);
    ctx.closePath();
  }
  ctx.fill();
}

/** Clips subsequent drawing to the inner panel; caller must save/restore */
export function clipToPanel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.rect(MANGA_PANEL_INSET, MANGA_PANEL_INSET, w - MANGA_PANEL_INSET * 2, h - MANGA_PANEL_INSET * 2);
  ctx.clip();
}

/** Comic panel border: heavy ink, spot-colour band, thin inner ink line */
export function drawInkFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ink: string,
  accent: string
): void {
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(MANGA_PANEL_INSET - 3, MANGA_PANEL_INSET - 3, w - (MANGA_PANEL_INSET - 3) * 2, h - (MANGA_PANEL_INSET - 3) * 2);
}

/** Jagged comic burst with an ink outline */
export interface InkFill {
  fill: string;
  ink: string;
  lineWidth: number;
}

export function drawBurst(ctx: CanvasRenderingContext2D, shape: StarShape, style: InkFill): void {
  starPath(ctx, shape);
  ctx.fillStyle = style.fill;
  ctx.fill();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = style.ink;
  ctx.lineWidth = style.lineWidth;
  ctx.stroke();
}

export interface ComicTextStyle {
  font: string;
  fill: string;
  ink: string;
  /** Thickness of the ink outline */
  outline: number;
  /** Offset of the solid ink drop behind the letters (0 = none) */
  drop?: number;
}

/** Bold lettering with a thick ink outline and optional offset ink drop */
export function drawComicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: ComicTextStyle
): void {
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  if (style.drop) {
    ctx.fillStyle = style.ink;
    if (style.outline > 0) {
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = style.outline;
      strokeSymbolText(ctx, text, x + style.drop, y + style.drop);
    }
    fillSymbolText(ctx, text, x + style.drop, y + style.drop);
  }

  if (style.outline > 0) {
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = style.outline;
    strokeSymbolText(ctx, text, x, y);
  }
  ctx.fillStyle = style.fill;
  fillSymbolText(ctx, text, x, y);
}

/** Rectangular caption box with an ink drop shadow */
export function drawCaptionBox(
  ctx: CanvasRenderingContext2D,
  { x: cx, y: cy, width, height }: Point & { width: number; height: number },
  paper: string,
  ink: string
): void {
  const x = cx - width / 2;
  const y = cy - height / 2;
  ctx.fillStyle = ink;
  ctx.fillRect(x + 6, y + 6, width, height);
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, width, height);
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, width, height);
}
