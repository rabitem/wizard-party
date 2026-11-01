'use client';

import { NEON_COLORS, NEON_LIGHTS } from '@/presentation/config/neon-environment.config';
import { SynthHorizon } from './SynthHorizon';
import { CitySkyline } from './CitySkyline';
import { RooftopDeck } from './RooftopDeck';
import { NeonSigns } from './NeonSigns';
import { HoloBillboards } from './HoloBillboards';
import { NeonRain } from './NeonRain';
import { NeonTableDecor } from './NeonTableDecor';
import { SteamVents } from './SteamVents';

/**
 * Neon Night: a rain-wet rooftop at night above a synthwave city. A striped
 * retro sun sets over a glowing grid, skyline towers with lit windows ring
 * the roof behind layers of violet haze, aircraft lights blink overhead,
 * holographic billboards hover between the towers and flickering neon tube
 * signs streak their colour across the puddled deck. GPU rain falls with
 * splash rings on the floor and steam curls from the roof vents.
 * Lights: magenta and cyan neon spill plus a violet hemisphere fill (no
 * shadows); every sign, window and strip is emissive only and blooms via
 * the room atmosphere (realism-atmosphere.config.ts).
 */
export function NeonEnvironment() {
  const { magenta, cyan, hemisphereIntensity } = NEON_LIGHTS;
  return (
    <group>
      <SynthHorizon />
      <CitySkyline />
      <RooftopDeck />
      <NeonSigns />
      <HoloBillboards />
      <NeonRain />
      <SteamVents />
      <NeonTableDecor />

      <pointLight position={magenta.position} color={magenta.color} intensity={magenta.intensity} distance={magenta.distance} decay={2} />
      <pointLight position={cyan.position} color={cyan.color} intensity={cyan.intensity} distance={cyan.distance} decay={2} />
      <hemisphereLight args={[NEON_COLORS.hemisphereSky, NEON_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
