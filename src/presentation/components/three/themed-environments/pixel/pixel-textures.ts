import * as THREE from 'three';
import { PIXEL_COLORS as C, PIXEL_TEXTURES as T } from '@/presentation/config/pixel-environment.config';
import { PIXEL_FONTS } from '@/presentation/utils/card-textures/styles/pixel-font';
import { createPaintedTexture, seededRandom } from '../primitives';

/**
 * Tiny canvas textures for the arcade hall, sampled with NearestFilter so
 * every texel stays a crisp square: star wallpaper, checkered floor, cabinet
 * marquee and the prize sign.
 */

/** Switches a painted texture to crisp, tiled pixel sampling. */
export function pixelate(texture: THREE.Texture, repeat?: [number, number]): THREE.Texture {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

/** Navy wallpaper with plus-shaped pixel stars and single-texel dust */
export function createStarWallpaper(): THREE.Texture {
  const size = T.WALLPAPER_SIZE;
  const texture = createPaintedTexture(size, size, (ctx) => {
    ctx.fillStyle = C.wallBase;
    ctx.fillRect(0, 0, size, size);
    const rand = seededRandom(64);
    for (let i = 0; i < T.WALLPAPER_STARS; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const big = i % 5 === 0;
      ctx.fillStyle = big ? C.wallStar : C.wallStarDim;
      ctx.fillRect(x, y, 1, 1);
      if (big) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect((x + dx + size) % size, (y + dy + size) % size, 1, 1);
      }
    }
  });
  return pixelate(texture, T.WALLPAPER_REPEAT);
}

/** 2x2 checker, one texel per floor tile */
export function createCheckerFloor(): THREE.Texture {
  const texture = createPaintedTexture(2, 2, (ctx) => {
    ctx.fillStyle = C.floorA;
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillStyle = C.floorB;
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillRect(0, 1, 1, 1);
  });
  return pixelate(texture, T.FLOOR_REPEAT);
}

/** Paints text in the 3x5 bitmap font, one texel per cell */
function paintBitmapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number): void {
  const font = PIXEL_FONTS.small;
  [...text].forEach((char, i) => {
    const glyph = font.glyphs[char as keyof typeof font.glyphs];
    glyph?.forEach((row, gy) => {
      [...row].forEach((cell, gx) => {
        if (cell === '#') ctx.fillRect(x + (i * (font.width + font.spacing) + gx) * scale, y + gy * scale, scale, scale);
      });
    });
  });
}

/**
 * Greyscale marquee art (bulb border, chevrons and a star), tinted per
 * cabinet through instance colours.
 */
export function createMarqueeTexture(): THREE.Texture {
  const [w, h] = T.MARQUEE_SIZE;
  const texture = createPaintedTexture(w, h, (ctx) => {
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9a9aa8';
    for (let x = 0; x < w; x += 6) {
      ctx.fillRect(x, 4, 3, 2);
      ctx.fillRect(x + 1, 6, 3, 2);
      ctx.fillRect(x, 8, 3, 2);
    }
    ctx.fillStyle = '#ffffff';
    for (let x = 1; x < w; x += 3) {
      ctx.fillRect(x, 1, 1, 1);
      ctx.fillRect(x, h - 2, 1, 1);
    }
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    ctx.fillRect(cx - 1, cy - 4, 2, 8);
    ctx.fillRect(cx - 4, cy - 1, 8, 2);
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  });
  return pixelate(texture);
}

/** "PRIZES" in the bitmap font with a bulb border */
export function createPrizeSignTexture(): THREE.Texture {
  const [w, h] = T.SIGN_SIZE;
  const texture = createPaintedTexture(w, h, (ctx) => {
    ctx.fillStyle = C.signBackground;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.signBulb;
    for (let x = 1; x < w; x += 3) {
      ctx.fillRect(x, 0, 1, 1);
      ctx.fillRect(x, h - 1, 1, 1);
    }
    for (let y = 2; y < h - 1; y += 3) {
      ctx.fillRect(0, y, 1, 1);
      ctx.fillRect(w - 1, y, 1, 1);
    }
    const text = 'PRIZES';
    const scale = 2;
    const width = (text.length * (PIXEL_FONTS.small.width + PIXEL_FONTS.small.spacing) - PIXEL_FONTS.small.spacing) * scale;
    const x = Math.floor((w - width) / 2);
    const y = Math.floor((h - PIXEL_FONTS.small.height * scale) / 2);
    ctx.fillStyle = '#7a4a00';
    paintBitmapText(ctx, text, x + 1, y + 1, scale);
    ctx.fillStyle = C.signText;
    paintBitmapText(ctx, text, x, y, scale);
  });
  return pixelate(texture);
}
