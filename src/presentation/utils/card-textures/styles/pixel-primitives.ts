'use client';

/**
 * Building blocks for the Pixel Arcade card faces: stepped frames, the
 * low-res background scenes per suit pattern, mirrored placement and the
 * centre "game window". All coordinates are grid cells.
 */

import type { SuitTheme } from '@/presentation/components/settings/card-theme-presets';
import { measurePixelText, pixelRandom, type PixelPainter, type PixelSprite, type SpriteColors } from './pixel-canvas';
import { PIXEL_FONTS } from './pixel-font';
import { SPARKLE } from './pixel-sprites';

/** Grid columns for every pixel face and back (rows follow the card ratio) */
export const PIXEL_GRID_COLS = 64;

/** 1-cell rectangular ring inset by the given number of cells from the grid edge */
export function insetRing(p: PixelPainter, inset: number, color: string): void {
  const x = inset;
  const y = inset;
  const w = p.cols - inset * 2;
  const h = p.rows - inset * 2;
  p.rect(x, y, w, 1, color);
  p.rect(x, y + h - 1, w, 1, color);
  p.rect(x, y + 1, 1, h - 2, color);
  p.rect(x + w - 1, y + 1, 1, h - 2, color);
}

export interface FrameColors {
  ink: string;
  metal: string;
  metalShade: string;
  light: string;
}

/** Ink / gold / shade rings with notched corners and rivets */
export function drawSteppedFrame(p: PixelPainter, c: FrameColors): void {
  const { cols, rows } = p;
  insetRing(p, 0, c.ink);
  insetRing(p, 1, c.metal);
  insetRing(p, 2, c.metalShade);
  insetRing(p, 3, c.ink);
  // Bevel highlight along the top/left of the gold ring
  p.rect(2, 1, cols - 4, 1, c.light);
  p.rect(1, 2, 1, rows - 4, c.light);
  // Corner rivets: 2x2 gold with a highlight cell
  for (const [x, y] of [[4, 4], [cols - 6, 4], [4, rows - 6], [cols - 6, rows - 6]] as const) {
    p.rect(x, y, 2, 2, c.metal);
    p.rect(x, y, 1, 1, c.light);
  }
}

/** Calls draw at (x, y) and again rotated 180 degrees about the card centre */
export function drawMirrored(
  p: PixelPainter,
  box: { x: number; y: number; w: number; h: number },
  draw: (x: number, y: number, flip: boolean) => void
): void {
  draw(box.x, box.y, false);
  draw(p.cols - box.x - box.w, p.rows - box.y - box.h, true);
}

/** Text centred horizontally on cx */
export function centeredText(
  p: PixelPainter,
  text: string,
  cx: number,
  y: number,
  options: { scale?: number; color: string; shadow?: string; font?: 'small' | 'big'; flip?: boolean }
): void {
  const width = measurePixelText(text, PIXEL_FONTS[options.font ?? 'small'], options.scale ?? 1);
  p.text(text, Math.round(cx - width / 2), y, options);
}

/** Sprite centred horizontally on cx */
export function centeredSprite(
  p: PixelPainter,
  sprite: PixelSprite,
  at: { cx: number; y: number },
  colors: SpriteColors,
  scale = 1
): void {
  const { cx, y } = at;
  const width = (sprite[0]?.length ?? 0) * scale;
  p.sprite(sprite, Math.round(cx - width / 2), y, colors, { scale });
}

export interface SceneColors {
  dark: string;
  light: string;
  accent: string;
}

function drawMountains(p: PixelPainter, c: SceneColors, rand: () => number): void {
  const peaks = [0.2 + rand() * 0.15, 0.55 + rand() * 0.2, 0.9].map((f) => Math.round(f * p.cols));
  const base = p.rows - 4;
  for (let x = 4; x < p.cols - 4; x++) {
    const height = Math.max(...peaks.map((px, i) => (i === 1 ? 20 : 14) - Math.abs(x - px)));
    if (height <= 0) continue;
    p.rect(x, base - height, 1, height, c.dark);
    p.rect(x, base - height, 1, Math.min(2, height), c.light);
  }
}

function drawStars(p: PixelPainter, c: SceneColors, rand: () => number): void {
  for (let i = 0; i < 14; i++) {
    p.rect(5 + Math.floor(rand() * (p.cols - 10)), 5 + Math.floor(rand() * (p.rows - 10)), 1, 1, c.light);
  }
  for (let i = 0; i < 3; i++) {
    const x = 6 + Math.floor(rand() * (p.cols - 17));
    const y = 6 + Math.floor(rand() * (p.rows - 17));
    p.sprite(SPARKLE, x, y, { a: c.dark, h: c.accent });
  }
}

function drawBricks(p: PixelPainter, c: SceneColors): void {
  const top = p.rows - 20;
  p.pattern(4, top, p.cols - 8, 16, (x, y) => {
    const row = Math.floor((y - top) / 4);
    if ((y - top) % 4 === 3) return c.dark;
    return (x + (row % 2) * 4) % 8 === 0 ? c.dark : null;
  });
  // Glowing ember slots along the top course
  for (let x = 8; x < p.cols - 8; x += 12) p.rect(x, top + 1, 2, 2, c.accent);
}

function drawCastle(p: PixelPainter, c: SceneColors): void {
  const base = p.rows - 4;
  const wallTop = base - 10;
  p.rect(4, wallTop, p.cols - 8, base - wallTop, c.dark);
  for (let x = 4; x < p.cols - 4; x += 4) p.rect(x, wallTop - 2, 2, 2, c.dark);
  for (const tx of [8, p.cols - 16]) {
    p.rect(tx, wallTop - 10, 8, 10, c.dark);
    for (let x = tx; x < tx + 8; x += 3) p.rect(x, wallTop - 12, 2, 2, c.dark);
    p.rect(tx + 3, wallTop - 7, 2, 3, c.accent);
  }
  p.rect(Math.round(p.cols / 2) - 3, base - 6, 6, 6, c.light);
}

/** Low-res backdrop motif per suit pattern, drawn behind everything else */
export function drawPixelScene(p: PixelPainter, pattern: SuitTheme['pattern'], c: SceneColors, seed: string): void {
  const rand = pixelRandom(seed);
  if (pattern === 'mountains') drawMountains(p, c, rand);
  else if (pattern === 'stars') drawStars(p, c, rand);
  else if (pattern === 'forge') drawBricks(p, c);
  else if (pattern === 'castle') drawCastle(p, c);
}

export interface WindowColors {
  ink: string;
  frame: string;
  frameLight: string;
  inside: string;
  scanline: string;
}

/** Bordered "game window" with a CRT scanline fill; returns the inner box */
export function drawGameWindow(
  p: PixelPainter,
  box: { x: number; y: number; w: number; h: number },
  c: WindowColors
): { x: number; y: number; w: number; h: number } {
  const { x, y, w, h } = box;
  p.panel(x + 1, y + 1, w, h, c.ink);
  p.panel(x, y, w, h, c.frame);
  p.rect(x + 1, y, w - 2, 1, c.frameLight);
  p.rect(x + 1, y + 1, w - 2, h - 2, c.ink);
  p.rect(x + 2, y + 2, w - 4, h - 4, c.inside);
  for (let sy = y + 3; sy < y + h - 2; sy += 2) p.rect(x + 2, sy, w - 4, 1, c.scanline);
  return { x: x + 2, y: y + 2, w: w - 4, h: h - 4 };
}

/** Shortens a label so it fits `maxWidth` cells in the small font */
export function fitLabel(text: string, maxWidth: number): string {
  let label = text.toUpperCase();
  while (label.length > 1 && measurePixelText(label) > maxWidth) label = label.slice(0, -1);
  return label;
}
