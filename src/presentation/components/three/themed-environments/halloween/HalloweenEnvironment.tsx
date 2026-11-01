'use client';

import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { HALLOWEEN_COLORS, HALLOWEEN_LIGHTS } from '@/presentation/config/halloween-environment.config';
import { useFlicker } from '../primitives';
import { HauntedManorRoom } from './HauntedManorRoom';
import { HalloweenProps } from './HalloweenProps';
import { HalloweenCreatures } from './HalloweenCreatures';
import { HalloweenTableDecor } from './HalloweenTableDecor';
import { Cauldron } from './Cauldron';
import { HalloweenAtmosphere } from './HalloweenAtmosphere';

/**
 * Haunted Manor: moonlit stone hall with jack-o'-lanterns, candles, a
 * bubbling cauldron, a graveyard corner, bats and cobwebs, moonlight shafts
 * and rolling ground fog. Lights (3 point lights, no shadows): moon + pumpkin
 * glow here, cauldron light inside <Cauldron />; the cool moon fill and bloom
 * come from the room atmosphere (realism-atmosphere.config.ts).
 */
export function HalloweenEnvironment() {
  const pumpkinLight = useRef<THREE.PointLight>(null);
  const { moon, pumpkins, hemisphereIntensity } = HALLOWEEN_LIGHTS;

  const flickerTargets = useMemo(
    () => [{ light: pumpkinLight, base: pumpkins.intensity, amplitude: 0.22, phase: 0.9 }],
    [pumpkins.intensity],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <HauntedManorRoom />
      <HalloweenProps />
      <Cauldron />
      <HalloweenCreatures />
      <HalloweenTableDecor />
      <HalloweenAtmosphere />

      <pointLight position={moon.position} color={moon.color} intensity={moon.intensity} distance={moon.distance} decay={2} />
      <pointLight
        ref={pumpkinLight}
        position={pumpkins.position}
        color={pumpkins.color}
        intensity={pumpkins.intensity}
        distance={pumpkins.distance}
        decay={2}
      />
      <hemisphereLight args={[HALLOWEEN_COLORS.hemisphereSky, HALLOWEEN_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
