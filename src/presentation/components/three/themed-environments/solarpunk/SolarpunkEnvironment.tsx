'use client';

import { SOLARPUNK_COLORS, SOLARPUNK_LIGHTS } from '@/presentation/config/solarpunk-environment.config';
import { GreenhouseAtrium } from './GreenhouseAtrium';
import { GreenhouseButterflies } from './GreenhouseButterflies';
import { GreenhousePlants } from './GreenhousePlants';
import { OutdoorEnergy } from './OutdoorEnergy';
import { SolarpunkTableDecor } from './SolarpunkTableDecor';
import { SunShafts } from './SunShafts';
import { WaterChannel } from './WaterChannel';

/**
 * Solarpunk greenhouse atrium: fresnel glass walls in white frames over a
 * birch knee wall, swaying hanging baskets, climbing vines, potted ferns and
 * monsteras, a shader water channel with caustics and lily pads, volumetric
 * sun shafts through the glass roof with dust and pollen, butterflies, and
 * wind turbines + solar arrays on the meadow outside.
 * Lights: high sun, green bounce fill and a hemisphere (no shadows); the
 * room's exposure, bloom and directional key come from its atmosphere entry.
 */
export function SolarpunkEnvironment() {
  const { sun, fill, hemisphereIntensity } = SOLARPUNK_LIGHTS;
  return (
    <group>
      <GreenhouseAtrium />
      <OutdoorEnergy />
      <GreenhousePlants />
      <WaterChannel />
      <SunShafts />
      <GreenhouseButterflies />
      <SolarpunkTableDecor />

      <pointLight position={sun.position} color={sun.color} intensity={sun.intensity} distance={sun.distance} decay={2} />
      <pointLight position={fill.position} color={fill.color} intensity={fill.intensity} distance={fill.distance} decay={2} />
      <hemisphereLight args={[SOLARPUNK_COLORS.hemisphereSky, SOLARPUNK_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
