'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { MatrixInstances } from '@/presentation/components/three/themed-environments/primitives/MatrixInstances';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { createSpringAssets, SPRING_VINE_LAYOUT } from './spring-surface.assets';

/** Meadow-moss felt with tiny flower specks and a flowering vine wound around the rim molding. */
export function SpringSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createSpringAssets, palette);

  return (
    <LayeredSurface
      layers={{
        base: assets.base,
        edge: assets.edge,
        center: assets.center,
        innerRing: assets.innerRing,
        outerRing: assets.outerRing,
      }}
    >
      <mesh geometry={assets.vineGeometry} material={assets.vine} />
      <MatrixInstances
        geometry={assets.leafGeometry}
        material={assets.leaf}
        matrices={SPRING_VINE_LAYOUT.leaves}
        colors={SPRING_VINE_LAYOUT.leafColors}
      />
      <MatrixInstances
        geometry={assets.blossomGeometry}
        material={assets.blossom}
        matrices={SPRING_VINE_LAYOUT.blossoms}
        colors={SPRING_VINE_LAYOUT.blossomColors}
      />
    </LayeredSurface>
  );
}
