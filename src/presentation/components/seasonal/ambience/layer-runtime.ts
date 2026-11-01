import type { AmbientLayerConfig, AmbientSprite } from '@/presentation/config/seasonal-ambience.config';
import type { LayerRuntime } from './types';

/** Silhouettes per sprite kind (sprites/ draws this many shapes per color). */
export const SPRITE_SHAPES: Partial<Record<AmbientSprite, number>> = { leaf: 3, petal: 2, fog: 2 };

/** Flap frames per bat color. */
export const BAT_FRAMES = 6;

/** Sprite layout of a layer: how many base sprites and frames the factory renders. */
export function layerRuntime(config: AmbientLayerConfig): LayerRuntime {
  const shapes = SPRITE_SHAPES[config.sprite] ?? 1;
  return {
    config,
    variants: Math.max(1, config.colors.length * shapes),
    frames: config.sprite === 'bat' ? BAT_FRAMES : 1,
  };
}
