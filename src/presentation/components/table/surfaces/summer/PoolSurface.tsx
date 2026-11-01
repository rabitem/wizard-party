'use client';

import { useFrame } from '@react-three/fiber';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { usePrefersReducedMotion } from '@/presentation/components/three/themed-environments/primitives/usePrefersReducedMotion';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { SURFACE_LAYOUT, SURFACE_MOTION } from '../surface.config';
import { createPoolAssets, POOL_EDGE } from './pool-surface.assets';
import { POOL_STILL_TIME, setPoolWaterTime } from './pool-water.material';
import { PoolFloaties } from './PoolFloaties';
import { PoolProps } from './PoolProps';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Summer table as a pool: animated water at the play height (cards still land
 * on the unchanged collider), a raised tiled coping with wet mosaic deck over
 * the wood rim, and poolside props kept outside the play radius.
 */
export function PoolSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createPoolAssets, palette);
  const reducedMotion = usePrefersReducedMotion();

  useFrame(({ clock }) => {
    const time = reducedMotion ? POOL_STILL_TIME : POOL_STILL_TIME + clock.getElapsedTime() * SURFACE_MOTION.WATER_SPEED;
    setPoolWaterTime(assets.water, time);
  });

  return (
    <LayeredSurface layers={{ base: assets.water, outerCap: assets.coping, armrestCap: assets.stone }}>
      <mesh geometry={assets.innerWall} material={assets.wall} />
      <mesh geometry={assets.outerWall} material={assets.coping} />
      <mesh geometry={assets.copingTop} material={assets.coping} rotation={FLAT} position={[0, POOL_EDGE.COPING_Y, 0]} receiveShadow />
      <mesh geometry={assets.deckGeometry} material={assets.deck} rotation={FLAT} position={[0, SURFACE_LAYOUT.RIM_OVERLAY_Y, 0]} receiveShadow />
      <PoolProps materials={assets} />
      <PoolFloaties materials={assets} />
    </LayeredSurface>
  );
}
