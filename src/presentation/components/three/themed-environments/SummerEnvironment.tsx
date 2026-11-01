'use client';

import { SUMMER_COLORS, SUMMER_LIGHTS, SUMMER_MOTES } from '@/presentation/config/summer-environment.config';
import { RealisticParticleField } from './primitives';
import { SeasideTerrace } from './summer/SeasideTerrace';
import { PalmTrees } from './summer/PalmTrees';
import { BeachFurniture } from './summer/BeachFurniture';
import { TikiTorches } from './summer/TikiTorches';
import { SummerTableDecor } from './summer/SummerTableDecor';

/**
 * Summer Terrace: a wooden deck above the beach at sunset. A shader sky with
 * sun glow, haze and cloud streaks over a glittering shader sea, swaying
 * palms, striped umbrellas over loungers, surfboards, tiki torches with real
 * flames and embers, and warm sun motes drifting over the deck.
 * Lights (no shadows): low sunset sun, cool sea fill, one flickering torch
 * light, hemisphere; the atmosphere config adds a warm key / cool fill and
 * bloom on the sun, glints and flames.
 */
export function SummerEnvironment() {
  const { sun, fill, hemisphereIntensity } = SUMMER_LIGHTS;
  return (
    <group>
      <SeasideTerrace />
      <PalmTrees />
      <BeachFurniture />
      <TikiTorches />
      <SummerTableDecor />
      <RealisticParticleField kind="dust" volume={SUMMER_MOTES.VOLUME} count={SUMMER_MOTES.COUNT} colors={SUMMER_MOTES.COLORS} wind={SUMMER_MOTES.WIND} seed={23} />

      <pointLight position={sun.position} color={sun.color} intensity={sun.intensity} distance={sun.distance} decay={2} />
      <pointLight position={fill.position} color={fill.color} intensity={fill.intensity} distance={fill.distance} decay={2} />
      <hemisphereLight args={[SUMMER_COLORS.hemisphereSky, SUMMER_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
