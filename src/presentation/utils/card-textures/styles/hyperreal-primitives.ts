'use client';

/**
 * Hyperreal drawing primitives: linen paper grain, vignette, embossed
 * bevel frame (light from the top-left), gold-foil gradients with a
 * specular highlight and soft drop shadows.
 */

import type { RandomSource } from '../drawing-utils';
import { mixColor, resetShadow, type Point } from './style-shared';
import { fillSymbolText, strokeSymbolText } from '../suit-glyphs';

/** Gradient axis from (x0, y0) to (x1, y1) */
export interface GradientAxis {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Circle extends Point {
  r: number;
}

/** Diagonal axis across the square that bounds a circle */
export function diagonalAxis(x: number, y: number, r: number): GradientAxis {
  return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
}

/** Frame band: from the outer edge inset to the inner edge inset */
export const HYPERREAL_FRAME_OUTER = 12;
export const HYPERREAL_FRAME_INNER = 38;

/** Linen threads plus fine paper specks, batched into a few paths */
export function drawPaperGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource,
  strength = 1
): void {
  const light = new RectBatch();
  const dark = new RectBatch();

  // Woven linen: horizontal and vertical threads of varying weight
  for (let y = 0; y < h; y += 3) {
    (random() > 0.5 ? light : dark).rects.push([0, y, w, random() > 0.7 ? 1.5 : 1]);
  }
  for (let x = 0; x < w; x += 3) {
    (random() > 0.5 ? light : dark).rects.push([x, 0, random() > 0.7 ? 1.5 : 1, h]);
  }
  // Paper fibres and specks
  for (let i = 0; i < 2600; i++) {
    const rect: [number, number, number, number] = [random() * w, random() * h, 1 + random() * 2, 1];
    (random() > 0.45 ? dark : light).rects.push(rect);
  }

  light.fill(ctx, `rgba(255,255,255,${0.045 * strength})`);
  dark.fill(ctx, `rgba(0,0,0,${0.06 * strength})`);
}

/** Collects rects so each tone is a single fill call */
class RectBatch {
  rects: Array<[number, number, number, number]> = [];

  fill(ctx: CanvasRenderingContext2D, style: string): void {
    ctx.fillStyle = style;
    ctx.beginPath();
    for (const [x, y, rw, rh] of this.rects) ctx.rect(x, y, rw, rh);
    ctx.fill();
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Brushed metal foil: alternating dark/bright bands along a diagonal */
export function createFoilGradient(ctx: CanvasRenderingContext2D, axis: GradientAxis, metal: string): CanvasGradient {
  const grad = ctx.createLinearGradient(axis.x0, axis.y0, axis.x1, axis.y1);
  grad.addColorStop(0, mixColor(metal, 'black', 0.35));
  grad.addColorStop(0.22, mixColor(metal, 'white', 0.55));
  grad.addColorStop(0.42, metal);
  grad.addColorStop(0.6, mixColor(metal, 'black', 0.3));
  grad.addColorStop(0.8, mixColor(metal, 'white', 0.3));
  grad.addColorStop(1, mixColor(metal, 'black', 0.45));
  return grad;
}

function quad(ctx: CanvasRenderingContext2D, points: number[], style: string): void {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

/** Raised metal frame with bevel lighting from the top-left */
export function drawBevelFrame(ctx: CanvasRenderingContext2D, w: number, h: number, metal: string): void {
  const o = HYPERREAL_FRAME_OUTER;
  const i = HYPERREAL_FRAME_INNER;

  // Soft shadow the frame casts onto the paper inside it
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = createFoilGradient(ctx, { x0: 0, y0: 0, x1: w, y1: h }, metal);
  ctx.beginPath();
  ctx.rect(o, o, w - o * 2, h - o * 2);
  ctx.rect(i, i, w - i * 2, h - i * 2);
  ctx.fill('evenodd');
  ctx.restore();

  // Bevel facets: lit top/left, shaded bottom/right
  const mid = (o + i) / 2;
  quad(ctx, [o, o, w - o, o, w - mid, mid, mid, mid], 'rgba(255,255,255,0.38)');
  quad(ctx, [o, o, mid, mid, mid, h - mid, o, h - o], 'rgba(255,255,255,0.22)');
  quad(ctx, [w - o, o, w - o, h - o, w - mid, h - mid, w - mid, mid], 'rgba(0,0,0,0.28)');
  quad(ctx, [o, h - o, w - o, h - o, w - mid, h - mid, mid, h - mid], 'rgba(0,0,0,0.4)');
  // Inner slope of the bevel faces the other way
  quad(ctx, [mid, mid, w - mid, mid, w - i, i, i, i], 'rgba(0,0,0,0.22)');
  quad(ctx, [mid, h - mid, w - mid, h - mid, w - i, h - i, i, h - i], 'rgba(255,255,255,0.18)');

  // Crisp edges
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(o + 0.75, o + 0.75, w - o * 2 - 1.5, h - o * 2 - 1.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(i, i, w - i * 2, h - i * 2);
}

export interface FoilTextOptions {
  font: string;
  metal: string;
  /** Approximate glyph height, used to size gradients and shadows */
  size: number;
}

/** Gold-foil lettering: drop shadow, foil gradient, dark rim, specular sheen */
export function drawFoilText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: FoilTextOptions
): void {
  const { font, metal, size } = options;
  const half = size / 2;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.max(4, size * 0.12);
  ctx.shadowOffsetX = Math.max(2, size * 0.03);
  ctx.shadowOffsetY = Math.max(3, size * 0.05);
  ctx.fillStyle = createFoilGradient(ctx, diagonalAxis(x, y, half), metal);
  fillSymbolText(ctx, text, x, y);
  resetShadow(ctx);

  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.strokeStyle = mixColor(metal, 'black', 0.6);
  strokeSymbolText(ctx, text, x, y);

  const sheen = ctx.createLinearGradient(x - half, y - half, x + half * 0.2, y + half * 0.4);
  sheen.addColorStop(0, 'rgba(255,255,255,0.75)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  fillSymbolText(ctx, text, x, y);
}

/** Domed medallion lifted off the card with a soft shadow and metal rim */
export function drawMedallion(ctx: CanvasRenderingContext2D, circle: Circle, base: string, metal: string): void {
  const { x: cx, y: cy, r } = circle;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetX = r * 0.05;
  ctx.shadowOffsetY = r * 0.08;
  const dome = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
  dome.addColorStop(0, mixColor(base, 'white', 0.32));
  dome.addColorStop(0.55, base);
  dome.addColorStop(1, mixColor(base, 'black', 0.45));
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Polished rim
  ctx.lineWidth = Math.max(3, r * 0.09);
  ctx.strokeStyle = createFoilGradient(ctx, diagonalAxis(cx, cy, r), metal);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Engraved inner ring: dark on the lit side, light on the shaded side
  const groove = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  groove.addColorStop(0, 'rgba(0,0,0,0.5)');
  groove.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.lineWidth = Math.max(1.5, r * 0.02);
  ctx.strokeStyle = groove;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
  ctx.stroke();
}

/** Letterpress text: a light lower edge makes the ink look pressed in */
export function drawEngravedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  { x, y }: Point,
  font: string,
  color: string
): void {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillText(text, x + 1, y + 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(text, x - 0.5, y - 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
