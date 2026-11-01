'use client';

/**
 * Drawing blocks for the Celestial Tarot art style: midnight star fields,
 * gilded tarot frames with an arched window, engraved title plates, roman
 * numerals and the four celestial emblems (sun, moon, star, comet).
 * Everything is vector canvas work; gold is a banded foil gradient.
 */

import type { RandomSource } from '../drawing-utils';
import { createFoilGradient, diagonalAxis } from './hyperreal-primitives';
import { mixColor, starPath, withAlpha, type CardSize, type Point } from './style-shared';

export const TAROT_SERIF = 'Georgia, "Times New Roman", serif';
const TAU = Math.PI * 2;

export type CelestialEmblem = 'sun' | 'moon' | 'star' | 'comet';
type Paint = string | CanvasGradient;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Foil gradient across a square of radius r around a point */
export function foilAt(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, metal: string): CanvasGradient {
  return createFoilGradient(ctx, diagonalAxis(x, y, r), metal);
}

/** Night sky card stock: vertical gradient, two nebula washes and seeded stars */
export function drawNightField(
  ctx: CanvasRenderingContext2D,
  { w, h }: CardSize,
  colors: { base: string; light: string; nebula: string },
  random: RandomSource
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, mixColor(colors.base, 'black', 0.25));
  grad.addColorStop(0.5, colors.light);
  grad.addColorStop(1, mixColor(colors.base, 'black', 0.35));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (const [fx, fy, fr] of [[0.25, 0.3, 0.55], [0.8, 0.72, 0.5]]) {
    const neb = ctx.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, w * fr);
    neb.addColorStop(0, withAlpha(colors.nebula, 0.22));
    neb.addColorStop(1, withAlpha(colors.nebula, 0));
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);
  }

  // Pinprick stars batched into one path, a few brighter four-point glints
  ctx.fillStyle = 'rgba(255,246,220,0.8)';
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = random() * w;
    const y = random() * h;
    const r = 0.5 + random() * 1.3;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  for (let i = 0; i < 6; i++) {
    starPath(ctx, { x: 40 + random() * (w - 80), y: 40 + random() * (h - 80), outer: 6, inner: 1.4, points: 4 });
    ctx.fill();
  }
}

/** Outer gilded border, fine inner rule and four-point rosettes in the corners */
export function drawGildedFrame(ctx: CanvasRenderingContext2D, { w, h }: CardSize, metal: string): void {
  const outer = 12;
  const inner = 28;
  ctx.fillStyle = createFoilGradient(ctx, { x0: 0, y0: 0, x1: w, y1: h }, metal);
  ctx.beginPath();
  ctx.rect(outer, outer, w - outer * 2, h - outer * 2);
  ctx.rect(inner, inner, w - inner * 2, h - inner * 2);
  ctx.fill('evenodd');

  ctx.strokeStyle = mixColor(metal, 'black', 0.55);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);
  ctx.strokeStyle = withAlpha(metal, 0.7);
  ctx.lineWidth = 1;
  ctx.strokeRect(inner + 8, inner + 8, w - (inner + 8) * 2, h - (inner + 8) * 2);

  // Dotted beading just inside the rule
  ctx.fillStyle = withAlpha(metal, 0.65);
  ctx.beginPath();
  for (let x = inner + 22; x < w - inner - 16; x += 14) {
    for (const y of [inner + 15, h - inner - 15]) {
      ctx.moveTo(x + 1.6, y);
      ctx.arc(x, y, 1.6, 0, TAU);
    }
  }
  ctx.fill();

  for (const [x, y] of [[inner, inner], [w - inner, inner], [inner, h - inner], [w - inner, h - inner]]) {
    starPath(ctx, { x, y, outer: 15, inner: 4, points: 4 });
    ctx.fillStyle = foilAt(ctx, { x, y }, 15, metal);
    ctx.fill();
  }
}

/** Path of a window with a semicircular top */
export function archPath(ctx: CanvasRenderingContext2D, { x, y, w, h }: Rect): void {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/** Arched window: glowing sky inside, double foil moulding around it */
export function drawArchWindow(ctx: CanvasRenderingContext2D, rect: Rect, metal: string, glow: string): void {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.48;
  archPath(ctx, rect);
  const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, rect.h * 0.6);
  sky.addColorStop(0, withAlpha(glow, 0.35));
  sky.addColorStop(0.6, withAlpha(glow, 0.08));
  sky.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sky;
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = createFoilGradient(ctx, { x0: rect.x, y0: rect.y, x1: rect.x + rect.w, y1: rect.y + rect.h }, metal);
  ctx.stroke();
  archPath(ctx, { x: rect.x + 9, y: rect.y + 9, w: rect.w - 18, h: rect.h - 18 });
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = withAlpha(metal, 0.6);
  ctx.stroke();
}

/** Ribbon-ended foil plate with engraved lettering */
export function drawTitlePlate(
  ctx: CanvasRenderingContext2D,
  plate: { cx: number; cy: number; w: number; h: number },
  text: string,
  colors: { metal: string; ink: string }
): void {
  const { cx, cy, w, h } = plate;
  const half = w / 2;
  const notch = h * 0.45;
  ctx.beginPath();
  ctx.moveTo(cx - half - notch, cy - h / 2);
  ctx.lineTo(cx + half + notch, cy - h / 2);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx + half + notch, cy + h / 2);
  ctx.lineTo(cx - half - notch, cy + h / 2);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
  ctx.fillStyle = createFoilGradient(ctx, { x0: cx - half, y0: cy - h, x1: cx + half, y1: cy + h }, colors.metal);
  ctx.fill();
  ctx.strokeStyle = mixColor(colors.metal, 'black', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `bold ${Math.round(h * 0.62)}px ${TAROT_SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(text, cx, cy + 1.5);
  ctx.fillStyle = colors.ink;
  ctx.fillText(text, cx, cy);
}

const ROMAN: ReadonlyArray<[number, string]> = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/** Roman numeral for tarot-style card titles (1 - 39) */
export function toRoman(value: number): string {
  let rest = Math.max(0, Math.floor(value));
  let out = '';
  for (const [n, glyph] of ROMAN) {
    while (rest >= n) {
      out += glyph;
      rest -= n;
    }
  }
  return out;
}

function drawSun(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, paint: Paint): void {
  ctx.fillStyle = paint;
  ctx.beginPath();
  const rays = 16;
  for (let i = 0; i < rays * 2; i++) {
    const a = (i * Math.PI) / rays - Math.PI / 2;
    // Long straight rays alternate with short ones
    let rr = r * 0.62;
    if (i % 2 === 0) rr = i % 4 === 0 ? r : r * 0.8;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();
}

function drawMoon(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, paint: Paint): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, TAU);
  ctx.arc(x + r * 0.36, y - r * 0.14, r * 0.68, 0, TAU);
  ctx.fillStyle = paint;
  ctx.fill('evenodd');
  ctx.restore();
}

function drawStarEmblem(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, paint: Paint): void {
  ctx.fillStyle = paint;
  starPath(ctx, { x, y, outer: r, inner: r * 0.36, points: 8 });
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  starPath(ctx, { x, y, outer: r * 0.45, inner: r * 0.12, points: 4 });
  ctx.fill();
}

function drawComet(ctx: CanvasRenderingContext2D, { x, y }: Point, r: number, paint: Paint): void {
  const head = { x: x + r * 0.42, y: y - r * 0.42 };
  ctx.fillStyle = paint;
  // Three tapering tail streaks sweeping to the lower left
  for (const [spread, length] of [[0, 1.45], [0.22, 1.15], [-0.22, 1.15]]) {
    const angle = Math.PI * 0.75 + spread;
    const tip = { x: head.x + Math.cos(angle) * r * length, y: head.y + Math.sin(angle) * r * length };
    const nx = -Math.sin(angle) * r * 0.2;
    const ny = Math.cos(angle) * r * 0.2;
    ctx.beginPath();
    ctx.moveTo(head.x + nx, head.y + ny);
    ctx.quadraticCurveTo((head.x + tip.x) / 2 + nx * 0.4, (head.y + tip.y) / 2 + ny * 0.4, tip.x, tip.y);
    ctx.quadraticCurveTo((head.x + tip.x) / 2 - nx * 0.4, (head.y + tip.y) / 2 - ny * 0.4, head.x - nx, head.y - ny);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(head.x, head.y, r * 0.3, 0, TAU);
  ctx.fill();
}

const EMBLEM_PAINTERS: Record<CelestialEmblem, typeof drawSun> = {
  sun: drawSun,
  moon: drawMoon,
  star: drawStarEmblem,
  comet: drawComet,
};

/** Draws one celestial emblem filled with the given paint (colour or foil) */
export function drawEmblem(ctx: CanvasRenderingContext2D, emblem: CelestialEmblem, center: Point, r: number, paint: Paint): void {
  EMBLEM_PAINTERS[emblem](ctx, center, r, paint);
}
