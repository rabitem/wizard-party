'use client';

import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { LightShafts, RealisticParticleField, useFlicker } from '../primitives';

const { BEAM, CANDLE_DUST, STARDUST, CANDLE_LIGHT } = CELESTIAL_REALISM;
const STARDUST_SWAY = 0.2;

/**
 * Observatory atmosphere: a pale starlight beam through the dome opening onto
 * the telescope (with dust motes), warm dust floating in the candle light,
 * twinkling gold stardust and the flickering candelabra light (the room's
 * third point light). Particles keep clear of the table by default.
 */
export function CelestialAtmosphere() {
  const candleLight = useRef<THREE.PointLight>(null);
  const flickerTargets = useMemo(
    () => [{ light: candleLight, base: CANDLE_LIGHT.intensity, amplitude: 0.2, phase: 1.7 }],
    [],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <LightShafts shafts={BEAM.shafts} color={BEAM.color} intensity={BEAM.intensity} dust={BEAM.dust} dustCount={BEAM.dustCount} />
      <RealisticParticleField kind="dust" volume={CANDLE_DUST.volume} count={CANDLE_DUST.count} colors={CANDLE_DUST.colors} seed={33} />
      <RealisticParticleField
        kind="fireflies"
        volume={STARDUST.volume}
        count={STARDUST.count}
        colors={STARDUST.colors}
        sizeScale={STARDUST.sizeScale}
        sway={STARDUST_SWAY}
        seed={71}
      />
      <pointLight
        ref={candleLight}
        position={CANDLE_LIGHT.position}
        color={CANDLE_LIGHT.color}
        intensity={CANDLE_LIGHT.intensity}
        distance={CANDLE_LIGHT.distance}
        decay={2}
      />
    </group>
  );
}
