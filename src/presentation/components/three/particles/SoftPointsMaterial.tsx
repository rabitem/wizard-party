'use client';

import type { ThreeElements } from '@react-three/fiber';
import { PARTICLE_SPRITE, softPointSize } from '../../../config/particle-sprite.config';
import { getFxTexture } from '../card-land-fx/textures';

export type SoftPointSprite = 'soft' | 'spark';

type SoftPointsMaterialProps = Omit<ThreeElements['pointsMaterial'], 'map' | 'size'> & {
  /** Soft round disc (default) or a disc with a four-point glint */
  sprite?: SoftPointSprite;
  /** Size of the equivalent square point (scaled by PARTICLE_SPRITE.SIZE_SCALE) */
  size: number;
};

/**
 * PointsMaterial drawing each point as a soft round sprite (the shared card-land FX textures,
 * painted once per page) instead of a hard square. Transparent, no depth write, perspective
 * sized; per-frame opacity / size updates on the material keep working as before (use
 * softPointSize for sizes written per frame).
 */
export function SoftPointsMaterial({ sprite = 'soft', size, ...props }: SoftPointsMaterialProps) {
  return (
    <pointsMaterial
      map={getFxTexture(sprite)}
      size={softPointSize(size)}
      alphaTest={PARTICLE_SPRITE.ALPHA_TEST}
      transparent
      depthWrite={false}
      sizeAttenuation
      {...props}
    />
  );
}
