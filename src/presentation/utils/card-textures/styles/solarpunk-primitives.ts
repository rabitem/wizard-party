'use client';

/**
 * Solarpunk drawing primitives: sun-bleached botanical paper with faint
 * line-art vines, a fine double ink frame, riveted brass corner brackets,
 * brass medallion rings and a leafy title plaque. Pure canvas, no assets.
 */

import type { RandomSource } from '../drawing-utils';
import { mixColor, withAlpha, type CardSize, type Point } from './style-shared';

export const SOLARPUNK_SERIF = 'Georgia, "Palatino Linotype", "Book Antiqua", serif';
export const SOLARPUNK_TITLE_FONT_SIZE = 30;

export interface SolarpunkColors {
  /** Paper base */
  paper: string;
  /** Paper tint towards the edges */
  tint: string;
  /** Botanical ink: line art, veins, numerals */
  ink: string;
  /** Brass for corners, rings and plaques */
  brass: string;
}

const FRAME_OUTER = 18;
const FRAME_INNER = 28;
const BRACKET_ARM = 58;
const BRACKET_WIDTH = 13;
const VINE_COUNT = 5;
const VINE_SEGMENTS = 9;

/** Vertical brass gradient: bright top highlight, dark lower band */
export function brassGradient(ctx: CanvasRenderingContext2D, y0: number, y1: number, brass: string): CanvasGradient {
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, mixColor(brass, 'white', 0.55));
  grad.addColorStop(0.45, brass);
  grad.addColorStop(1, mixColor(brass, 'black', 0.35));
  return grad;
}

/** Path of a pointed leaf from `base` along `angle` (does not fill/stroke) */
export function leafPath(ctx: CanvasRenderingContext2D, base: Point, length: number, width: number, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (along: number, side: number): [number, number] => [
    base.x + cos * along - sin * side,
    base.y + sin * along + cos * side,
  ];
  ctx.beginPath();
  ctx.moveTo(...at(0, 0));
  ctx.quadraticCurveTo(...at(length * 0.4, width), ...at(length, 0));
  ctx.quadraticCurveTo(...at(length * 0.4, -width), ...at(0, 0));
  ctx.closePath();
}

/** Leaf with a midrib and paired side veins, the house style of every emblem */
export function drawVeinedLeaf(
  ctx: CanvasRenderingContext2D,
  base: Point,
  shape: { length: number; width: number; angle: number },
  colors: { fill: string; ink: string },
  lineWidth = 2
): void {
  const { length, width, angle } = shape;
  leafPath(ctx, base, length, width, angle);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(base.x + cos * length * 0.92, base.y + sin * length * 0.92);
  const veins = Math.max(2, Math.round(length / 18));
  for (let i = 1; i <= veins; i++) {
    const t = i / (veins + 1);
    const along = length * t * 0.9;
    const reach = width * 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const mx = base.x + cos * along;
    const my = base.y + sin * along;
    for (const side of [1, -1]) {
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + cos * reach * 0.8 - sin * reach * side, my + sin * reach * 0.8 + cos * reach * side);
    }
  }
  ctx.lineWidth = lineWidth * 0.55;
  ctx.stroke();
}

/** Paper gradient, sun wash and faint line-art vines growing in from the edges */
export function drawBotanicalPaper(ctx: CanvasRenderingContext2D, { w, h }: CardSize, colors: SolarpunkColors, random: RandomSource): void {
  const grad = ctx.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, h * 0.72);
  grad.addColorStop(0, mixColor(colors.paper, 'white', 0.35));
  grad.addColorStop(0.6, colors.paper);
  grad.addColorStop(1, colors.tint);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.lineCap = 'round';
  for (let v = 0; v < VINE_COUNT; v++) {
    const fromLeft = v % 2 === 0;
    let x = fromLeft ? FRAME_INNER : w - FRAME_INNER;
    let y = h * (0.12 + random() * 0.76);
    let heading = (fromLeft ? 0 : Math.PI) + (random() - 0.5) * 0.8;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    for (let s = 0; s < VINE_SEGMENTS; s++) {
      const len = 16 + random() * 10;
      const nx = x + Math.cos(heading) * len;
      const ny = y + Math.sin(heading) * len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(heading + 0.6) * len * 0.5, y + Math.sin(heading + 0.6) * len * 0.5, nx, ny);
      ctx.stroke();
      if (s % 2 === 1) {
        const side = s % 4 === 1 ? 1 : -1;
        drawVeinedLeaf(ctx, { x: nx, y: ny }, { length: 22, width: 8, angle: heading + side * 1.1 }, { fill: withAlpha(colors.ink, 0.25), ink: colors.ink }, 1.5);
      }
      x = nx;
      y = ny;
      heading += (random() - 0.5) * 0.9;
    }
  }
  ctx.restore();
}

/** Fine double ink frame inset from the card edge */
export function drawInkFrame(ctx: CanvasRenderingContext2D, { w, h }: CardSize, colors: SolarpunkColors): void {
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(FRAME_OUTER, FRAME_OUTER, w - FRAME_OUTER * 2, h - FRAME_OUTER * 2);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(FRAME_INNER, FRAME_INNER, w - FRAME_INNER * 2, h - FRAME_INNER * 2);

  // Tiny sprout ticks at the side midpoints
  const mids: Array<[number, number, number]> = [
    [w / 2, FRAME_OUTER, Math.PI / 2],
    [w / 2, h - FRAME_OUTER, -Math.PI / 2],
    [FRAME_OUTER, h / 2, 0],
    [w - FRAME_OUTER, h / 2, Math.PI],
  ];
  for (const [x, y, angle] of mids) {
    for (const side of [-0.7, 0.7]) {
      drawVeinedLeaf(ctx, { x, y }, { length: 18, width: 6, angle: angle + side }, { fill: colors.paper, ink: colors.ink }, 1.4);
    }
  }
}

/** Riveted brass L-brackets with a curled leaf on each corner */
export function drawBrassCorners(ctx: CanvasRenderingContext2D, { w, h }: CardSize, colors: SolarpunkColors): void {
  const corners: Array<[number, number, number, number]> = [
    [FRAME_OUTER, FRAME_OUTER, 1, 1],
    [w - FRAME_OUTER, FRAME_OUTER, -1, 1],
    [FRAME_OUTER, h - FRAME_OUTER, 1, -1],
    [w - FRAME_OUTER, h - FRAME_OUTER, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sx * BRACKET_ARM, y);
    ctx.lineTo(x + sx * BRACKET_ARM, y + sy * BRACKET_WIDTH * 0.6);
    ctx.quadraticCurveTo(x + sx * BRACKET_WIDTH * 1.2, y + sy * BRACKET_WIDTH, x + sx * BRACKET_WIDTH, y + sy * BRACKET_WIDTH * 1.2);
    ctx.quadraticCurveTo(x + sx * BRACKET_WIDTH, y + sy * BRACKET_WIDTH, x + sx * BRACKET_WIDTH * 0.6, y + sy * BRACKET_ARM);
    ctx.lineTo(x, y + sy * BRACKET_ARM);
    ctx.closePath();
    ctx.fillStyle = brassGradient(ctx, y - BRACKET_ARM, y + BRACKET_ARM, colors.brass);
    ctx.fill();
    ctx.strokeStyle = mixColor(colors.brass, 'black', 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rivets
    for (const [rx, ry] of [[BRACKET_ARM - 9, 5.5], [5.5, BRACKET_ARM - 9], [7, 7]] as const) {
      ctx.beginPath();
      ctx.arc(x + sx * rx, y + sy * ry, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = mixColor(colors.brass, 'white', 0.6);
      ctx.fill();
      ctx.strokeStyle = mixColor(colors.brass, 'black', 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const angle = Math.atan2(sy, sx);
    drawVeinedLeaf(ctx, { x: x + sx * 22, y: y + sy * 22 }, { length: 30, width: 10, angle }, { fill: withAlpha(colors.ink, 0.35), ink: colors.ink }, 1.6);
  }
}

/** Brass medallion: paper disc, double brass ring and a ring of tiny leaf ticks */
export function drawBrassMedallion(ctx: CanvasRenderingContext2D, center: Point, r: number, colors: SolarpunkColors): void {
  const { x, y } = center;
  const disc = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  disc.addColorStop(0, mixColor(colors.paper, 'white', 0.5));
  disc.addColorStop(1, colors.tint);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = brassGradient(ctx, y - r, y + r, colors.brass);
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r - 9, 0, Math.PI * 2);
  ctx.stroke();

  const ticks = 24;
  ctx.beginPath();
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const inner = r - (i % 2 === 0 ? 20 : 15);
    ctx.moveTo(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10));
    ctx.lineTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
  }
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/**
 * Brass plaque with the card title in ink small caps and a leaf at each end.
 * Default width keeps the end leaves clear of the bottom-right corner badge.
 */
export function drawTitlePlaque(
  ctx: CanvasRenderingContext2D,
  center: Point,
  text: string,
  colors: SolarpunkColors,
  width = 184,
  fontSize = SOLARPUNK_TITLE_FONT_SIZE
): void {
  const height = 48;
  const { x, y } = center;
  const left = x - width / 2;
  ctx.beginPath();
  ctx.moveTo(left + 14, y - height / 2);
  ctx.lineTo(left + width - 14, y - height / 2);
  ctx.quadraticCurveTo(left + width, y, left + width - 14, y + height / 2);
  ctx.lineTo(left + 14, y + height / 2);
  ctx.quadraticCurveTo(left, y, left + 14, y - height / 2);
  ctx.closePath();
  ctx.fillStyle = brassGradient(ctx, y - height / 2, y + height / 2, colors.brass);
  ctx.fill();
  ctx.strokeStyle = mixColor(colors.brass, 'black', 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const side of [-1, 1]) {
    const base = { x: x + side * (width / 2 + 2), y };
    drawVeinedLeaf(ctx, base, { length: 26, width: 9, angle: side > 0 ? -0.35 : Math.PI + 0.35 }, { fill: withAlpha(colors.ink, 0.3), ink: colors.ink }, 1.8);
  }

  ctx.fillStyle = mixColor(colors.ink, 'black', 0.35);
  ctx.font = `bold ${fontSize}px ${SOLARPUNK_SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 2);
}

/** Corner badge: paper disc in a brass ring with a tiny sprout on top */
export function drawCornerBadge(ctx: CanvasRenderingContext2D, r: number, colors: SolarpunkColors): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = mixColor(colors.paper, 'white', 0.4);
  ctx.fill();
  ctx.strokeStyle = brassGradient(ctx, -r, r, colors.brass);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
  ctx.stroke();
}
