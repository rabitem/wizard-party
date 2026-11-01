'use client';

import {
  AUTUMN_ATMOSPHERE_FX,
  AUTUMN_COLORS,
  AUTUMN_LAYOUT,
  AUTUMN_LEAF_COLORS,
  AUTUMN_SUN_SHAFTS,
} from '@/presentation/config/autumn-environment.config';
import { LightShafts, RealisticParticleField, SoftGroundFog, type LightShaft } from '../primitives';

const SHAFTS: readonly LightShaft[] = AUTUMN_SUN_SHAFTS;
const { HAZE } = AUTUMN_ATMOSPHERE_FX;

/**
 * Autumn realism layers: tumbling leaves drifting down through the barn,
 * warm late-afternoon sun shafts from the window with dust motes, and a
 * soft golden haze over the back half of the floor.
 */
export function AutumnAtmosphere() {
  return (
    <group>
      <RealisticParticleField
        kind="leaves"
        volume={AUTUMN_LAYOUT.LEAF_AREA}
        count={AUTUMN_LAYOUT.LEAF_COUNT}
        colors={AUTUMN_LEAF_COLORS}
        wind={AUTUMN_LAYOUT.LEAF_WIND}
        seed={17}
      />
      <LightShafts
        shafts={SHAFTS}
        color={AUTUMN_COLORS.sunShaft}
        intensity={AUTUMN_ATMOSPHERE_FX.SHAFT_INTENSITY}
        dust={AUTUMN_ATMOSPHERE_FX.DUST_VOLUME}
        dustCount={AUTUMN_ATMOSPHERE_FX.DUST_COUNT}
      />
      <SoftGroundFog center={HAZE.center} size={HAZE.size} height={HAZE.height} color={AUTUMN_COLORS.haze} opacity={HAZE.opacity} speed={0.8} />
    </group>
  );
}
