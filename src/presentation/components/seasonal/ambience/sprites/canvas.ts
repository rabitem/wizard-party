import { SPRITE_MAX_PX, SPRITE_MIN_PX } from '@/presentation/config/seasonal-ambience.config';

/**
 * A pre-rendered sprite. w/h are the drawn box relative to the particle size (longest side 1),
 * so the renderer draws it at (size * w) x (size * h).
 */
export interface SpriteImage {
  image: HTMLCanvasElement;
  w: number;
  h: number;
}

export type Rgb = readonly [number, number, number];

/** Offscreen canvas + 2D context for drawing one sprite once. */
export function createSpriteCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { canvas, ctx };
}

/** Sprite edge in device px for a layer whose largest particle is `maxSize` CSS px. */
export function spriteResolution(maxSize: number, dpr: number): number {
  return Math.max(SPRITE_MIN_PX, Math.min(SPRITE_MAX_PX, Math.ceil(maxSize * dpr)));
}

/** Parse '#rgb', '#rrggbb' or 'rgb(r, g, b)' into channels (white on anything else). */
export function parseColor(color: string): Rgb {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const v = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  const rgb = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return [255, 255, 255];
}

/** Lighten (amount > 0, towards white) or darken (amount < 0, towards black). */
export function shade(rgb: Rgb, amount: number): Rgb {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  return [
    Math.round(rgb[0] + (target - rgb[0]) * t),
    Math.round(rgb[1] + (target - rgb[1]) * t),
    Math.round(rgb[2] + (target - rgb[2]) * t),
  ];
}

export const rgba = (rgb: Rgb, alpha: number): string => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

/** Smoothstep falloff stops from `inner` (opaque) to 1 (clear) for soft radial edges. */
export function addSoftStops(gradient: CanvasGradient, rgb: Rgb, inner: number, peak = 1, steps = 6): void {
  gradient.addColorStop(0, rgba(rgb, peak));
  if (inner > 0) gradient.addColorStop(inner, rgba(rgb, peak));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = 1 - t * t * (3 - 2 * t);
    gradient.addColorStop(inner + (1 - inner) * t, rgba(rgb, peak * eased));
  }
}
