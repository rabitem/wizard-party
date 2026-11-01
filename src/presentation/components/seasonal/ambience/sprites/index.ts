import type { AmbientLayerConfig } from '@/presentation/config/seasonal-ambience.config';
import { SPRITE_SHAPES } from '../layer-runtime';
import type { LayerRuntime } from '../types';
import { parseColor, spriteResolution, type Rgb, type SpriteImage } from './canvas';
import { drawBatFrame, drawFog } from './creature-sprites';
import { drawBokeh, drawFlake, drawGlow, drawPixel, drawStar, drawStreak } from './glow-sprites';
import { drawLeaf, drawPetal, drawSeed } from './shape-sprites';

export type { SpriteImage } from './canvas';

/** One sprite for (color, shape) - index = shape * colors + color, matching layerRuntime(). */
function drawVariant(config: AmbientLayerConfig, rgb: Rgb, shape: number, res: number): SpriteImage {
  const blur = config.blur ?? 0;
  switch (config.sprite) {
    case 'flake': return drawFlake(rgb, res, blur);
    case 'bokeh': return drawBokeh(rgb, res);
    case 'glow': return drawGlow(rgb, res, blur);
    case 'star': return drawStar(rgb, res);
    case 'pixel': return drawPixel(rgb);
    case 'streak': return drawStreak(rgb, res);
    case 'leaf': return drawLeaf(rgb, res, shape);
    case 'petal': return drawPetal(rgb, res, shape);
    case 'seed': return drawSeed(rgb, res);
    case 'fog': return drawFog(rgb, shape);
    case 'bat': return drawBatFrame(rgb, res, 0, 1);
  }
}

/**
 * Pre-render every sprite a layer can draw, once, at device resolution. Order matches the
 * particle `sprite` index: variants (shape-major), and for bats color-major flap frames.
 */
export function buildLayerSprites(runtime: LayerRuntime, dpr: number): SpriteImage[] {
  const { config, frames } = runtime;
  const res = spriteResolution(config.size[1], dpr);
  const colors = config.colors.map(parseColor);
  const sprites: SpriteImage[] = [];
  if (config.sprite === 'bat') {
    for (const rgb of colors) {
      for (let frame = 0; frame < frames; frame++) sprites.push(drawBatFrame(rgb, res, frame, frames));
    }
    return sprites;
  }
  const shapes = SPRITE_SHAPES[config.sprite] ?? 1;
  for (let shape = 0; shape < shapes; shape++) {
    for (const rgb of colors) sprites.push(drawVariant(config, rgb, shape, res));
  }
  return sprites;
}
