'use client';

import { SPRING_COLORS, SPRING_LIGHTS } from '@/presentation/config/spring-environment.config';
import { BlossomPavilion } from './spring/BlossomPavilion';
import { CherryTrees } from './spring/CherryTrees';
import { Fountain } from './spring/Fountain';
import { GardenFlowers } from './spring/GardenFlowers';
import { GrassTufts } from './spring/GrassTufts';
import { Butterflies } from './spring/Butterflies';
import { PaperLanterns } from './spring/PaperLanterns';
import { SpringAtmosphere } from './spring/SpringAtmosphere';
import { SpringTableDecor } from './spring/SpringTableDecor';

/**
 * Spring Blossom Garden: an open pavilion in warm low sun with cherry trees,
 * flower beds, grass and pots, a tiered fountain with shader water and spray,
 * butterflies, paper lanterns, drifting petals, sun shafts and lawn mist.
 * Lights: low golden sun, lavender fill, hemisphere (lanterns are emissive
 * only); the room's exposure / bloom / directional key come from its
 * atmosphere entry.
 */
export function SpringEnvironment() {
  const { sun, fill, hemisphereIntensity } = SPRING_LIGHTS;
  return (
    <group>
      <BlossomPavilion />
      <CherryTrees />
      <GardenFlowers />
      <GrassTufts />
      <Fountain />
      <PaperLanterns />
      <Butterflies />
      <SpringAtmosphere />
      <SpringTableDecor />

      <pointLight position={sun.position} color={sun.color} intensity={sun.intensity} distance={sun.distance} decay={2} />
      <pointLight position={fill.position} color={fill.color} intensity={fill.intensity} distance={fill.distance} decay={2} />
      <hemisphereLight args={[SPRING_COLORS.hemisphereSky, SPRING_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
