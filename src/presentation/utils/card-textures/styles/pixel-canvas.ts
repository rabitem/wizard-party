'use client';

/**
 * Low-res "pixel canvas" for the Pixel Arcade card faces and back.
 *
 * Art is painted in grid units onto a tiny canvas (e.g. 64 x 96) and blown up
 * to the card size with imageSmoothingEnabled = false, so every grid cell
 * becomes a crisp square block. Without a DOM (tests, SSR) the same paint
 * calls run on the target context under a scale transform, which produces the
 * identical block layout.
 */

import { PIXEL_FONTS, type PixelFont } from './pixel-font';

/** Minimal drawing surface the painter needs (2D or Offscreen 2D context) */
interface PixelTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Sprite rows: one char per cell, '.' is transparent */
export type PixelSprite = readonly string[];
/** Sprite char -> colour */
export type SpriteColors = Readonly<Record<string, string>>;

export interface SpriteOptions {
  scale?: number;
  /** Rotate 180 degrees (for mirrored card corners) */
  flip?: boolean;
}

export interface TextOptions {
  font?: keyof typeof PIXEL_FONTS;
  scale?: number;
  color: string;
  /** Optional 1-cell drop shadow colour */
  shadow?: string;
  flip?: boolean;
}

/** 4x4 ordered (Bayer) dither thresholds, 0..15 */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

export interface PixelPainter {
  readonly cols: number;
  readonly rows: number;
  rect(x: number, y: number, w: number, h: number, color: string): void;
  /** Rectangle with 1-cell notched corners (the classic 8-bit panel shape) */
  panel(x: number, y: number, w: number, h: number, color: string): void;
  sprite(sprite: PixelSprite, x: number, y: number, colors: SpriteColors, options?: SpriteOptions): void;
  /** Draws text; returns its width in cells */
  text(text: string, x: number, y: number, options: TextOptions): number;
  /** Vertical ordered-dither blend from `top` to `bottom` colour */
  ditherGradient(top: string, bottom: string): void;
  /** Fills each cell with colorAt(x, y) (null = skip), merging horizontal runs */
  pattern(x: number, y: number, w: number, h: number, colorAt: (cx: number, cy: number) => string | null): void;
}

export function spriteSize(sprite: PixelSprite, scale = 1): { w: number; h: number } {
  return { w: (sprite[0]?.length ?? 0) * scale, h: sprite.length * scale };
}

export function measurePixelText(text: string, font: PixelFont = PIXEL_FONTS.small, scale = 1): number {
  if (text.length === 0) return 0;
  return (text.length * (font.width + font.spacing) - font.spacing) * scale;
}

function createPainter(target: PixelTarget, cols: number, rows: number): PixelPainter {
  let current = '';
  const fill = (color: string, x: number, y: number, w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    if (color !== current) {
      target.fillStyle = color;
      current = color;
    }
    target.fillRect(x, y, w, h);
  };

  const sprite: PixelPainter['sprite'] = (rowsData, x, y, colors, options = {}) => {
    const scale = options.scale ?? 1;
    const height = rowsData.length;
    rowsData.forEach((row, ry) => {
      const width = row.length;
      // Merge horizontal runs of one colour into a single fillRect
      let rx = 0;
      while (rx < width) {
        const char = row[rx];
        let run = 1;
        while (rx + run < width && row[rx + run] === char) run++;
        const color = colors[char];
        if (char !== '.' && color) {
          const cx = options.flip ? width - rx - run : rx;
          const cy = options.flip ? height - 1 - ry : ry;
          fill(color, x + cx * scale, y + cy * scale, run * scale, scale);
        }
        rx += run;
      }
    });
  };

  const pattern: PixelPainter['pattern'] = (x, y, w, h, colorAt) => {
    for (let cy = y; cy < y + h; cy++) {
      let cx = x;
      while (cx < x + w) {
        const color = colorAt(cx, cy);
        let run = 1;
        while (cx + run < x + w && colorAt(cx + run, cy) === color) run++;
        if (color) fill(color, cx, cy, run, 1);
        cx += run;
      }
    }
  };

  return {
    cols,
    rows,
    rect: (x, y, w, h, color) => fill(color, x, y, w, h),
    panel(x, y, w, h, color) {
      fill(color, x + 1, y, w - 2, h);
      fill(color, x, y + 1, 1, h - 2);
      fill(color, x + w - 1, y + 1, 1, h - 2);
    },
    sprite,
    text(text, x, y, options) {
      const font = PIXEL_FONTS[options.font ?? 'small'];
      const scale = options.scale ?? 1;
      const width = measurePixelText(text, font, scale);
      const chars = options.flip ? [...text].reverse() : [...text];
      const draw = (ox: number, oy: number, color: string) => {
        chars.forEach((char, i) => {
          const glyph = font.glyphs[char.toUpperCase()];
          if (!glyph) return;
          sprite(glyph, ox + i * (font.width + font.spacing) * scale, oy, { '#': color }, { scale, flip: options.flip });
        });
      };
      if (options.shadow) draw(x + (options.flip ? -scale : scale), y + (options.flip ? -scale : scale), options.shadow);
      draw(x, y, options.color);
      return width;
    },
    ditherGradient(top, bottom) {
      fill(top, 0, 0, cols, rows);
      pattern(0, 0, cols, rows, (cx, cy) => {
        const level = Math.round((cy / Math.max(rows - 1, 1)) * 16);
        return BAYER_4X4[cy & 3][cx & 3] < level ? bottom : null;
      });
    },
    pattern,
  };
}

/** A 2D context on the low-res surface (DOM or offscreen canvas share the drawing API used here) */
type LowResSurface = { source: CanvasImageSource; target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D };

/** Alpha at or above this snaps to a solid cell, below it to an empty one */
const PIXEL_ALPHA_THRESHOLD = 128;
const OPAQUE = 255;

/** Grid rows for a `cols`-wide grid at the card's aspect ratio */
export function pixelGridRows(w: number, h: number, cols: number): number {
  return Math.round((cols * h) / w);
}

function createLowResSurface(cols: number, rows: number): LowResSurface | null {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const target = canvas.getContext('2d');
    return target ? { source: canvas, target } : null;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(cols, rows);
    const target = canvas.getContext('2d');
    return target ? { source: canvas, target } : null;
  }
  return null;
}

/**
 * Paints pixel art on a `cols`-wide grid (rows follow the card aspect ratio)
 * and scales it onto the card with nearest-neighbour sampling.
 */
export function paintPixelArt(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cols: number,
  paint: (painter: PixelPainter) => void
): void {
  const rows = pixelGridRows(w, h, cols);
  const surface = createLowResSurface(cols, rows);
  ctx.save();
  if (surface) {
    paint(createPainter(surface.target, cols, rows));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surface.source, 0, 0, w, h);
  } else {
    ctx.imageSmoothingEnabled = false;
    ctx.scale(w / cols, h / rows);
    paint(createPainter(ctx, cols, rows));
  }
  ctx.restore();
}

/** Makes every cell fully opaque or fully empty, so anti-aliased edges become hard pixel steps */
function snapAlpha(target: LowResSurface['target'], cols: number, rows: number): void {
  const image = target.getImageData(0, 0, cols, rows);
  // Fake contexts (tests) have no pixel buffer
  if (!image?.data) return;
  const { data } = image;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= PIXEL_ALPHA_THRESHOLD ? OPAQUE : 0;
  target.putImageData(image, 0, 0);
}

/**
 * Rasterises vector art onto the pixel grid: `paint` draws with canvas paths
 * in grid units at grid resolution, edges are snapped to whole cells and the
 * result is blown up like paintPixelArt. Lets shared vector art (e.g. the
 * special card emblems) join the pixel style without hand-made sprites.
 */
export function paintPixelVector(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cols: number,
  paint: (target: CanvasRenderingContext2D) => void
): void {
  const rows = pixelGridRows(w, h, cols);
  const surface = createLowResSurface(cols, rows);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (surface) {
    // The offscreen 2D context implements every path and fill call the art uses
    paint(surface.target as CanvasRenderingContext2D);
    snapAlpha(surface.target, cols, rows);
    ctx.drawImage(surface.source, 0, 0, w, h);
  } else {
    ctx.scale(w / cols, h / rows);
    paint(ctx);
  }
  ctx.restore();
}

/** Deterministic hash-based PRNG (no Math.random, so textures are stable) */
export function pixelRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
