'use client';

import { PIXEL_REALISM } from '@/presentation/config/pixel-environment.config';
import { RealisticParticleField } from '../primitives';

/**
 * Dust motes hanging in the light in front of each cabinet row: one GPU
 * point field per row (additive, slow drift, gentle flicker), tinted by the
 * screen colours. Counts scale with the device tier; frozen for reduced
 * motion by the toolkit.
 */
export function ArcadeDust() {
  return (
    <group>
      {PIXEL_REALISM.DUST.map((field, i) => (
        <RealisticParticleField
          key={field.id}
          kind="dust"
          volume={field.volume}
          count={field.count}
          colors={PIXEL_REALISM.DUST_COLORS}
          sizeScale={PIXEL_REALISM.DUST_SIZE}
          opacity={PIXEL_REALISM.DUST_OPACITY}
          seed={71 + i * 13}
        />
      ))}
    </group>
  );
}
