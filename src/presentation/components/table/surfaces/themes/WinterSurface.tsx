'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { createWinterAssets } from './winter-surface.assets';

/** Frozen ice play surface with a frost-crystal edge and snow piled softly on the rim. */
export function WinterSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createWinterAssets, palette);

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
      }}
    >
      <mesh geometry={assets.innerDrift} material={assets.snow} receiveShadow />
      <mesh geometry={assets.outerDrift} material={assets.snow} receiveShadow />
      <mesh geometry={assets.armrestDrift} material={assets.snow} receiveShadow />
    </LayeredSurface>
  );
}
