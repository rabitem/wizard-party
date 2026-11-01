'use client';

import { AUTUMN_COLORS, AUTUMN_LIGHTS } from '@/presentation/config/autumn-environment.config';
import { HarvestBarnRoom } from './HarvestBarnRoom';
import { HarvestProps } from './HarvestProps';
import { HarvestLanterns } from './HarvestLanterns';
import { Fireplace } from './Fireplace';
import { AutumnTableDecor } from './AutumnTableDecor';
import { AutumnAtmosphere } from './AutumnAtmosphere';

/**
 * Autumn Harvest: timber barn with a crackling fireplace (rising sparks),
 * straw hay bales, pumpkins and gourds, apple crates, lanterns, tumbling
 * leaves and late-afternoon sun shafts with dust motes through the window.
 * Point lights (max 3): fireplace (inside <Fireplace />) and one lantern
 * fill; the warm sun key comes from the room's atmosphere config. No shadows.
 */
export function AutumnEnvironment() {
  const { lantern, hemisphereIntensity } = AUTUMN_LIGHTS;
  return (
    <group>
      <HarvestBarnRoom />
      <Fireplace />
      <HarvestProps />
      <HarvestLanterns />
      <AutumnAtmosphere />
      <AutumnTableDecor />

      <pointLight position={lantern.position} color={lantern.color} intensity={lantern.intensity} distance={lantern.distance} decay={2} />
      <hemisphereLight args={[AUTUMN_COLORS.hemisphereSky, AUTUMN_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
