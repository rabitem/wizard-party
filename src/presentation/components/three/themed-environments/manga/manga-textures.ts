import * as THREE from 'three';
import { MANGA_COLORS, MANGA_SKY } from '@/presentation/config/manga-environment.config';
import { createPaintedTexture, fillVerticalGradient } from '../primitives/canvas-texture';
import { seededRandom } from '../primitives/instancing';
import { brushStroke, drawEnso, drawHanko, drawInkGlyph } from './ink-brush';

/**
 * Canvas textures for the Shonen Ink dojo. Builders return fresh textures;
 * components memoise and dispose them.
 */

const SKY_SIZE = { W: 512, H: 256 } as const;
const SCROLL_SIZE = { W: 128, H: 384 } as const;
const LANTERN_SIZE = { W: 256, H: 128 } as const;
const SCROLL_SILK = ['#3a4458', '#4e3426', '#2f3a30'] as const;

/** Repeat-wrapped, anisotropic texture with the given UV repeat. */
export function tile(texture: THREE.Texture, repeat: [number, number]): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return texture;
}

/** Ridge line silhouette filled with an ink wash that fades into mist below. */
interface Ridge {
  baseY: number;
  height: number;
  color: string;
  seed: number;
}

function drawRidge(ctx: CanvasRenderingContext2D, w: number, h: number, { baseY, height, color, seed }: Ridge): void {
  const rand = seededRandom(seed);
  const points: Array<[number, number]> = [];
  let peak = rand();
  for (let x = -20; x <= w + 20; x += 16) {
    peak += (rand() - 0.5) * 0.5;
    peak = Math.max(0, Math.min(1, peak));
    points.push([x, baseY - peak * height - rand() * height * 0.15]);
  }
  const wash = ctx.createLinearGradient(0, baseY - height, 0, baseY + h * 0.18);
  wash.addColorStop(0, color);
  wash.addColorStop(0.65, color);
  wash.addColorStop(1, 'rgba(230,223,208,0)');
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(points[0][0], h);
  points.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(points[points.length - 1][0], h);
  ctx.closePath();
  ctx.fill();
}

/** Ink-wash (sumi-e) mountains with a red sun, seen through the open back wall. */
export function createInkMountainTexture(): THREE.Texture {
  return createPaintedTexture(SKY_SIZE.W, SKY_SIZE.H, (ctx, w, h) => {
    fillVerticalGradient(ctx, w, h, [[0, MANGA_SKY.top], [1, MANGA_SKY.bottom]]);
    ctx.fillStyle = MANGA_SKY.sun;
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.28, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
    MANGA_SKY.ridges.forEach((color, i) => {
      drawRidge(ctx, w, h, { baseY: h * (0.55 + i * 0.13), height: h * (0.34 - i * 0.05), color, seed: 101 + i * 13 });
    });
    ctx.strokeStyle = MANGA_COLORS.ink;
    ctx.lineWidth = 1.5;
    const birds: Array<[number, number]> = [[0.3, 0.2], [0.34, 0.24], [0.27, 0.26]];
    birds.forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.moveTo(w * bx - 5, h * by - 2);
      ctx.quadraticCurveTo(w * bx - 2, h * by - 4, w * bx, h * by);
      ctx.quadraticCurveTo(w * bx + 2, h * by - 4, w * bx + 5, h * by - 2);
      ctx.stroke();
    });
  });
}

/** Hanging scroll (kakejiku): silk mounting, paper panel and ink art per variant. */
export function createScrollTexture(variant: number): THREE.Texture {
  return createPaintedTexture(SCROLL_SIZE.W, SCROLL_SIZE.H, (ctx, w, h) => {
    const rand = seededRandom(57 + variant * 11);
    ctx.fillStyle = SCROLL_SILK[variant % SCROLL_SILK.length];
    ctx.fillRect(0, 0, w, h);
    const inset = { x: w * 0.12, top: h * 0.14, bottom: h * 0.1 };
    const panel = { x: inset.x, y: inset.top, w: w - inset.x * 2, h: h - inset.top - inset.bottom };
    ctx.fillStyle = MANGA_COLORS.paper;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = MANGA_COLORS.gold;
    ctx.fillRect(0, inset.top - 4, w, 2);
    ctx.fillRect(0, h - inset.bottom + 2, w, 2);
    ctx.fillStyle = MANGA_COLORS.ink;
    ctx.strokeStyle = MANGA_COLORS.ink;

    const cx = w / 2;
    if (variant % 3 === 0) {
      drawEnso(ctx, cx, panel.y + panel.h * 0.42, panel.w * 0.36, rand);
      drawInkGlyph(ctx, cx, panel.y + panel.h * 0.8, panel.w * 0.22, rand);
    } else if (variant % 3 === 1) {
      const glyphs = 4;
      for (let i = 0; i < glyphs; i++) drawInkGlyph(ctx, cx, panel.y + panel.h * ((i + 0.6) / (glyphs + 0.4)), panel.w * 0.3, rand);
    } else {
      // Ink bamboo: segmented stalk with a few sweeping leaves.
      const stalkX = panel.x + panel.w * 0.4;
      for (let y = panel.y + panel.h * 0.92; y > panel.y + panel.h * 0.12; y -= panel.h * 0.16) {
        brushStroke(ctx, [[stalkX, y], [stalkX + 1, y - panel.h * 0.14]], 6, rand);
      }
      for (let i = 0; i < 5; i++) {
        const y = panel.y + panel.h * (0.2 + i * 0.13);
        const dir = i % 2 === 0 ? 1 : -1;
        brushStroke(ctx, [[stalkX, y], [stalkX + dir * panel.w * 0.25, y + 6], [stalkX + dir * panel.w * 0.48, y + 14]], 5, rand);
      }
    }
    drawHanko(ctx, panel.x + panel.w * 0.78, panel.y + panel.h * 0.9, 9, MANGA_COLORS.red);
  });
}

/** Paper lantern skin: ink ribs and a bold red brush mark on two sides. */
export function createLanternTexture(): THREE.Texture {
  return createPaintedTexture(LANTERN_SIZE.W, LANTERN_SIZE.H, (ctx, w, h) => {
    const rand = seededRandom(73);
    ctx.fillStyle = MANGA_COLORS.paper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(40,30,20,0.35)';
    for (let y = 6; y < h; y += 10) ctx.fillRect(0, y, w, 1.5);
    ctx.fillStyle = MANGA_COLORS.red;
    ctx.strokeStyle = MANGA_COLORS.red;
    [0.25, 0.75].forEach((u) => drawInkGlyph(ctx, w * u, h * 0.5, h * 0.42, rand));
  });
}
