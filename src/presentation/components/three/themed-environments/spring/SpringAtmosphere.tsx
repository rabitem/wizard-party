'use client';

import { SPRING_PETAL_COLORS, SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { LightShafts, RealisticParticleField, SoftGroundFog } from '../primitives';

const R = SPRING_REALISM;

/**
 * Garden air: cherry petals drifting down from the trees (GPU particles,
 * kept clear of the table), soft morning sun shafts slanting through the
 * pergola with dust motes, and a thin mist hugging the lawn.
 */
export function SpringAtmosphere() {
  return (
    <>
      <RealisticParticleField
        kind="petals"
        volume={R.PETALS.volume}
        count={R.PETALS.count}
        colors={SPRING_PETAL_COLORS}
        wind={R.PETALS.wind}
        gust={R.PETALS.gust}
        seed={23}
      />
      <LightShafts
        shafts={R.SHAFTS}
        color={R.SHAFT_COLOR}
        intensity={R.SHAFT_INTENSITY}
        dust={R.SHAFT_DUST}
        dustCount={R.SHAFT_DUST_COUNT}
      />
      <SoftGroundFog
        center={R.MIST.center}
        size={R.MIST.size}
        height={R.MIST.height}
        color={R.MIST.color}
        opacity={R.MIST.opacity}
        speed={R.MIST.speed}
      />
    </>
  );
}
