import type { Particle } from './particle';
import type { SpriteImage } from './sprites';
import type { LayerRuntime } from './types';

/** Particles fainter than this are skipped entirely. */
const MIN_VISIBLE_ALPHA = 0.004;
/** Pixel sprites are 3 px wide, so pixel particles snap to multiples of 3 device px. */
const PIXEL_GRID = 3;

/** Everything the renderer needs for one layer. */
export interface RenderLayer {
  runtime: LayerRuntime;
  sprites: SpriteImage[];
  particles: Particle[];
}

function drawPixelParticle(ctx: CanvasRenderingContext2D, p: Particle, image: SpriteImage, dpr: number): void {
  const edge = Math.max(PIXEL_GRID, Math.round((p.size * dpr) / PIXEL_GRID) * PIXEL_GRID);
  const half = Math.floor(edge / 2);
  ctx.setTransform(1, 0, 0, 1, Math.round(p.x * dpr), Math.round(p.y * dpr));
  ctx.drawImage(image.image, -half, -half, edge, edge);
}

/**
 * Clear and draw every layer. One setTransform + drawImage per particle, no allocations: rotation,
 * tumble (scaleX) and squash (scaleY) all go through the transform.
 */
export function renderLayers(
  ctx: CanvasRenderingContext2D,
  layers: readonly RenderLayer[],
  dpr: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  for (let l = 0; l < layers.length; l++) {
    const { runtime, sprites, particles } = layers[l];
    const { additive, pixelated } = runtime.config;
    ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    ctx.imageSmoothingEnabled = !pixelated;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.drawAlpha < MIN_VISIBLE_ALPHA) continue;
      const image = sprites[p.sprite];
      if (!image) continue;
      ctx.globalAlpha = p.drawAlpha > 1 ? 1 : p.drawAlpha;
      if (pixelated) {
        drawPixelParticle(ctx, p, image, dpr);
        continue;
      }
      const cos = Math.cos(p.angle) * dpr;
      const sin = Math.sin(p.angle) * dpr;
      ctx.setTransform(cos * p.scaleX, sin * p.scaleX, -sin * p.scaleY, cos * p.scaleY, p.x * dpr, p.y * dpr);
      const w = p.size * image.w;
      const h = p.size * image.h;
      ctx.drawImage(image.image, -w / 2, -h / 2, w, h);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
}
