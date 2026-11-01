'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_MOTION } from '../surface.config';
import { useSurfacePulse } from '../useSurfacePulse';
import { createNeonAssets, NEON_STRIP } from './neon-surface.assets';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Black glass with a glowing grid, a cyan edge strip with a breathing halo, neon rim trims. */
export function NeonSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createNeonAssets, palette);
  useSurfacePulse(assets.halo, { base: 0.5, amplitude: 0.15, speed: SURFACE_MOTION.PULSE_SPEED, property: 'opacity' });
  useSurfacePulse(assets.lipCap, { base: 1.1, amplitude: 0.25, speed: SURFACE_MOTION.PULSE_SPEED });

  return (
    <LayeredSurface
      layers={{
        base: assets.base,
        edge: assets.edge,
        center: assets.center,
        innerRing: assets.innerRing,
        outerRing: assets.outerRing,
        rim: assets.rim,
        lipCap: assets.lipCap,
        outerCap: assets.outerCap,
      }}
    >
      <mesh geometry={assets.haloGeometry} material={assets.halo} rotation={FLAT} position={[0, NEON_STRIP.Y, 0]} />
      <mesh geometry={assets.stripGeometry} material={assets.strip} rotation={FLAT} position={[0, NEON_STRIP.Y + 0.0005, 0]} />
    </LayeredSurface>
  );
}
