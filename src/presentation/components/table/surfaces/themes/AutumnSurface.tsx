'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { MatrixInstances } from '@/presentation/components/three/themed-environments/primitives/MatrixInstances';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { AUTUMN_DRY_LEAVES, createAutumnAssets } from './autumn-surface.assets';

/** Oak-leaf embossed russet felt, warm polished rim and a few dry leaves on the felt edge. */
export function AutumnSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createAutumnAssets, palette);

  return (
    <LayeredSurface
      layers={{
        base: assets.base,
        edge: assets.edge,
        center: assets.center,
        innerRing: assets.innerRing,
        outerRing: assets.outerRing,
        rim: assets.rim,
        lipCap: assets.cap,
        outerCap: assets.cap,
      }}
    >
      <MatrixInstances
        geometry={assets.leafGeometry}
        material={assets.leaf}
        matrices={AUTUMN_DRY_LEAVES.matrices}
        colors={AUTUMN_DRY_LEAVES.colors}
      />
    </LayeredSurface>
  );
}
