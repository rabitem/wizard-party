'use client';

import { HALLOWEEN_REALISM } from '@/presentation/config/halloween-environment.config';
import { LightShafts, SoftGroundFog } from '../primitives';

const { GROUND_FOG, MOON_SHAFTS } = HALLOWEEN_REALISM;

/**
 * Haunted Manor atmosphere: moonlight shafts through the gothic windows with
 * drifting dust motes, and a low rolling fog over the flagstones. Two draw
 * calls for the shafts + fog, one per dust field; no lights, no post pass.
 */
export function HalloweenAtmosphere() {
  return (
    <group>
      <LightShafts
        shafts={MOON_SHAFTS.shafts}
        color={MOON_SHAFTS.color}
        intensity={MOON_SHAFTS.intensity}
        dust={MOON_SHAFTS.dust}
        dustCount={MOON_SHAFTS.dustCount}
      />
      <SoftGroundFog
        size={GROUND_FOG.size}
        height={GROUND_FOG.height}
        color={GROUND_FOG.color}
        opacity={GROUND_FOG.opacity}
        scale={GROUND_FOG.scale}
        speed={GROUND_FOG.speed}
      />
    </group>
  );
}
