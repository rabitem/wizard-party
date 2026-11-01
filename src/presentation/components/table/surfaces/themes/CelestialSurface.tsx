'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_LAYER_Y, SURFACE_MOTION } from '../surface.config';
import { useSurfacePulse } from '../useSurfacePulse';
import { createCelestialAssets } from './celestial-surface.assets';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Midnight velvet with twinkling constellation lines and a gold zodiac ring inlay. */
export function CelestialSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createCelestialAssets, palette);
  useSurfacePulse(assets.decal, { base: 0.75, amplitude: 0.15, speed: SURFACE_MOTION.PULSE_SPEED * 0.6, property: 'opacity' });

  return (
    <LayeredSurface
      layers={{
        base: assets.base,
        edge: assets.edge,
        center: assets.center,
        decal: assets.decal,
        innerRing: assets.innerRing,
        outerRing: assets.outerRing,
        rim: assets.rim,
        lipCap: assets.goldCap,
        outerCap: assets.darkCap,
      }}
    >
      <mesh geometry={assets.zodiacGeometry} material={assets.zodiac} rotation={FLAT} position={[0, SURFACE_LAYER_Y.INLAY, 0]} />
    </LayeredSurface>
  );
}
