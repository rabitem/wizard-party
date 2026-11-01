'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PIXEL_COLORS, PIXEL_DECOR as D } from '@/presentation/config/pixel-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { getVoxelGeometry } from './voxel-models';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH } = ENVIRONMENT_ROOM;
const STRIPE_DEPTH = 0.04;
const WALL_INSET = 0.03;
/** Stripe colour multiplier so the bloom pass catches the neon */
const STRIPE_BLOOM = 1.6;

const MUSHROOMS: PropPlacement[] = D.MUSHROOMS.map((m) => ({ ...m }));

type BlockKind = 'brick' | 'bonus';
const blocksOf = (kind: BlockKind): PropPlacement[] => [
  ...D.BLOCK_STACK.filter((b) => b.kind === kind).map(({ position, scale, rotationY }) => ({ position, scale, rotationY })),
  ...D.FLOATING_BLOCKS.filter(([, k]) => k === kind).map(([x]) => ({
    position: [x, D.FLOATING_Y, D.FLOATING_Z] as PropPlacement['position'],
    scale: D.FLOATING_SCALE,
  })),
];
const BRICKS = blocksOf('brick');
const BONUS = blocksOf('bonus');
const HEART: PropPlacement[] = [D.HEART];

/** Two neon stripes running around the back and side walls above the cabinets */
const STRIPES: PropPlacement[] = D.STRIPE_HEIGHTS.flatMap((height, i) => {
  const y = FLOOR_Y + height;
  const color = i === 0 ? PIXEL_COLORS.stripeA : PIXEL_COLORS.stripeB;
  return [
    { position: [0, y, -HALF_DEPTH + WALL_INSET], scale: [HALF_WIDTH * 2, D.STRIPE_THICKNESS, STRIPE_DEPTH], color },
    { position: [-HALF_WIDTH + WALL_INSET, y, 0], scale: [STRIPE_DEPTH, D.STRIPE_THICKNESS, HALF_DEPTH * 2], color },
    { position: [HALF_WIDTH - WALL_INSET, y, 0], scale: [STRIPE_DEPTH, D.STRIPE_THICKNESS, HALF_DEPTH * 2], color },
  ] satisfies PropPlacement[];
});

/**
 * Platformer flavour: giant spotted mushrooms in the back-left corner, a
 * brick/bonus block stack and a floating block row over the cabinets, a wall
 * heart and neon wall stripes (bloom-bright).
 */
export function VoxelDecor() {
  const assets = useMemo(
    () => ({
      voxel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
      bonus: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: '#ffb02e', emissiveIntensity: 0.18 }),
      stripe: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(STRIPE_BLOOM), toneMapped: false }),
      box: new THREE.BoxGeometry(1, 1, 1),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={getVoxelGeometry('mushroom')} material={assets.voxel} placements={MUSHROOMS} />
      <InstancedProp geometry={getVoxelGeometry('brick')} material={assets.voxel} placements={BRICKS} />
      <InstancedProp geometry={getVoxelGeometry('bonus')} material={assets.bonus} placements={BONUS} />
      <InstancedProp geometry={getVoxelGeometry('heart', 'center')} material={assets.bonus} placements={HEART} />
      <InstancedProp geometry={assets.box} material={assets.stripe} placements={STRIPES} />
    </group>
  );
}
