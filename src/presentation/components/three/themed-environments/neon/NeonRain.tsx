'use client';

import { NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { RealisticParticleField } from '../primitives';
import { RainRipples } from './RainRipples';

const { RAIN } = NEON_REALISM;

/**
 * Night rain over the roof: GPU-driven velocity-aligned streaks (one draw
 * call, tinted by the surrounding neon, kept clear above the table) plus
 * splash rings on the wet deck. The realism toolkit scales the count per
 * device tier and freezes it for reduced motion.
 */
export function NeonRain() {
  return (
    <group>
      <RealisticParticleField
        kind="rain"
        volume={RAIN.VOLUME}
        count={RAIN.COUNT}
        colors={RAIN.COLORS}
        wind={RAIN.WIND}
        fallSpeed={RAIN.FALL_SPEED}
        opacity={RAIN.OPACITY}
        seed={RAIN.SEED}
      />
      <RainRipples />
    </group>
  );
}
