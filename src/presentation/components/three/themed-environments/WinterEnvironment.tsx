'use client';

import { WINTER_COLORS, WINTER_LIGHTS } from '@/presentation/config/winter-environment.config';
import { AlpineLodgeRoom } from './winter/AlpineLodgeRoom';
import { SnowyWindows } from './winter/SnowyWindows';
import { SnowyPorch } from './winter/SnowyPorch';
import { SnowyYard } from './winter/SnowyYard';
import { WinterAtmosphere } from './winter/WinterAtmosphere';
import { LodgeFireplace } from './winter/LodgeFireplace';
import { ChristmasTree } from './winter/ChristmasTree';
import { Snowman } from './winter/Snowman';
import { WinterTableDecor } from './winter/WinterTableDecor';

/**
 * Winter Lodge: a cozy log cabin at night. The back wall opens onto a
 * covered porch where heavy snow falls in gusts past snow-laden pines and a
 * moonlit forest; frosted windows show the same night with parallax. Cold
 * moonlight pours through the archway (blue shaft, mist, melt footprints)
 * against the warm fireplace, candles and tree (bloom via the room's
 * atmosphere config).
 * Point lights (max 3): fireplace (inside <LodgeFireplace />) and the moon at
 * the archway; plus a hemisphere fill. No shadows.
 */
export function WinterEnvironment() {
  const { moon, hemisphereIntensity } = WINTER_LIGHTS;
  return (
    <group>
      <AlpineLodgeRoom />
      <SnowyPorch />
      <SnowyYard />
      <SnowyWindows />
      <WinterAtmosphere />
      <LodgeFireplace />
      <ChristmasTree />
      <Snowman />
      <WinterTableDecor />

      <pointLight position={moon.position} color={moon.color} intensity={moon.intensity} distance={moon.distance} decay={2} />
      <hemisphereLight args={[WINTER_COLORS.hemisphereSky, WINTER_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
