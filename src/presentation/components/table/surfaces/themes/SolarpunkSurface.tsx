'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { MatrixInstances } from '@/presentation/components/three/themed-environments/primitives/MatrixInstances';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_LAYOUT } from '../surface.config';
import { createSolarpunkAssets, SOLARPUNK_BRASS_LEAVES } from './solarpunk-surface.assets';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const BRASS_LINE_Y = SURFACE_LAYOUT.RIM_OVERLAY_Y + 0.001;

/** Moss-green leaf-vein felt with a light birch rim and brass line + leaf inlays. */
export function SolarpunkSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createSolarpunkAssets, palette);

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
      <mesh geometry={assets.brassLineInner} material={assets.brass} rotation={FLAT} position={[0, BRASS_LINE_Y, 0]} />
      <mesh geometry={assets.brassLineOuter} material={assets.brass} rotation={FLAT} position={[0, BRASS_LINE_Y, 0]} />
      <MatrixInstances geometry={assets.brassLeafGeometry} material={assets.brass} matrices={SOLARPUNK_BRASS_LEAVES} />
    </LayeredSurface>
  );
}
