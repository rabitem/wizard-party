'use client';

import { CELESTIAL_COLORS, CELESTIAL_FLOOR_CANDLES, CELESTIAL_LIGHTS } from '@/presentation/config/celestial-environment.config';
import { CandleCluster } from '../primitives';
import { ArmillarySphere } from './ArmillarySphere';
import { CelestialAtmosphere } from './CelestialAtmosphere';
import { CelestialDome } from './CelestialDome';
import { CelestialTableDecor } from './CelestialTableDecor';
import { CrystalBall } from './CrystalBall';
import { FloatingPlanets } from './FloatingPlanets';
import { ObservatoryRoom } from './ObservatoryRoom';
import { ObservatoryShelves } from './ObservatoryShelves';
import { ShootingStars } from './ShootingStars';
import { Telescope } from './Telescope';

/**
 * Celestial Tarot: a midnight observatory. Domed sky with a deep twinkling
 * starfield, the milky way and slowly wheeling gilded constellations,
 * occasional shooting stars, a big brass telescope in a starlight beam, an
 * armillary sphere, floating ringed planets, a glowing crystal ball,
 * bookcases with astrolabes and candles, dust and stardust in the candle
 * light and tiny curios on the table rim.
 * Point lights (3, no shadows): gold key here, the crystal ball light inside
 * <CrystalBall />, the candelabra light inside <CelestialAtmosphere />; the
 * cool dome fill and bloom come from the room atmosphere.
 */
export function CelestialEnvironment() {
  const { key, hemisphereIntensity } = CELESTIAL_LIGHTS;

  return (
    <group>
      <ObservatoryRoom />
      <CelestialDome />
      <ShootingStars />
      <Telescope />
      <ArmillarySphere />
      <FloatingPlanets />
      <ObservatoryShelves />
      <CrystalBall />
      <CelestialTableDecor />
      <CandleCluster
        candles={CELESTIAL_FLOOR_CANDLES}
        waxColor={CELESTIAL_COLORS.candleWax}
        flameColor={CELESTIAL_COLORS.candleFlame}
        glowColor={CELESTIAL_COLORS.candleGlow}
        glowStrength={0.55}
      />
      <CelestialAtmosphere />

      <pointLight position={key.position} color={key.color} intensity={key.intensity} distance={key.distance} decay={2} />
      <hemisphereLight
        args={[CELESTIAL_COLORS.hemisphereSky, CELESTIAL_COLORS.hemisphereGround, hemisphereIntensity]}
        position={[0, 10, 0]}
      />
    </group>
  );
}
