'use client';

import { useMemo } from 'react';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { MatrixInstances } from '@/presentation/components/three/themed-environments/primitives/MatrixInstances';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_LAYER_Y } from '../surface.config';
import { createPixelAssets, createPixelBlockLayout } from './pixel-surface.assets';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Pixel-pattern felt with low-poly inlay rings, a brick rim and chunky block battlements. */
export function PixelSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createPixelAssets, palette);
  const blocks = useMemo(() => createPixelBlockLayout(palette), [palette]);

  return (
    <LayeredSurface layers={{ base: assets.base, edge: assets.edge, rim: assets.rim }}>
      <mesh geometry={assets.centerGeometry} material={assets.center} rotation={FLAT} position={[0, SURFACE_LAYER_Y.CENTER, 0]} />
      <mesh geometry={assets.innerRingGeometry} material={assets.innerRing} rotation={FLAT} position={[0, SURFACE_LAYER_Y.INNER_RING, 0]} />
      <mesh geometry={assets.outerRingGeometry} material={assets.outerRing} rotation={FLAT} position={[0, SURFACE_LAYER_Y.OUTER_RING, 0]} />
      <MatrixInstances geometry={assets.blockGeometry} material={assets.block} matrices={blocks.matrices} colors={blocks.colors} />
    </LayeredSurface>
  );
}
