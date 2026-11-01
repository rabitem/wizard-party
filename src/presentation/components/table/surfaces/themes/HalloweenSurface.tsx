'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_MOTION } from '../surface.config';
import { useSurfacePulse } from '../useSurfacePulse';
import { createHalloweenAssets } from './halloween-surface.assets';

/** Worn purple velvet with cobwebs + wax drips, cracked dark rim with faintly glowing carved runes. */
export function HalloweenSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createHalloweenAssets, palette);
  useSurfacePulse(assets.rim, { base: 0.45, amplitude: 0.18, speed: SURFACE_MOTION.RUNE_FLICKER_SPEED });

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
        lipCap: assets.cap,
        outerCap: assets.cap,
      }}
    />
  );
}
