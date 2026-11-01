'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PIXEL_COLORS, PIXEL_RIM_COIN_POSITIONS, PIXEL_RIM_DECOR as R } from '@/presentation/config/pixel-environment.config';
import { InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { getVoxelGeometry } from './voxel-models';

const COIN_VOXEL = R.COIN_STACK.voxel;
/** Coins lie flat, so lift them by half their one-voxel thickness */
const RIM_COINS: PropPlacement[] = PIXEL_RIM_COIN_POSITIONS.map(([x, y, z], i) => ({
  position: [x, y + COIN_VOXEL / 2, z],
  scale: COIN_VOXEL,
  rotationY: i * 0.7,
  tilt: [Math.PI / 2, 0],
}));

const JOYSTICK = {
  base: { size: [0.16, 0.05, 0.13] as const, y: 0.025 },
  stick: { size: [0.018, 0.09, 0.018] as const, y: 0.095 },
  ball: { size: 0.05, y: 0.15 },
  buttonOffset: 0.05,
};

/**
 * Tiny arcade souvenirs on the wood rim (visual only, no colliders), one per
 * safe slot outside the play area: a coin stack, a mini mushroom, a joystick
 * and a bonus block.
 */
export function PixelTableDecor() {
  const assets = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      voxel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }),
      coin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2, emissive: '#ffb02e', emissiveIntensity: 0.2 }),
      base: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.joystickBase, roughness: 0.6 }),
      stick: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.joystickStick, roughness: 0.3, metalness: 0.4 }),
      ball: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.joystickBall, roughness: 0.35, emissive: PIXEL_COLORS.joystickBall, emissiveIntensity: 0.25 }),
    }),
    [],
  );
  useDisposables(assets);
  const { base, stick, ball, buttonOffset } = JOYSTICK;

  return (
    <group>
      <InstancedProp geometry={getVoxelGeometry('coin', 'center')} material={assets.coin} placements={RIM_COINS} />
      <mesh
        geometry={getVoxelGeometry('mushroom')}
        material={assets.voxel}
        position={R.MUSHROOM.position}
        rotation={[0, R.MUSHROOM.rotationY, 0]}
        scale={R.MUSHROOM.voxel}
      />
      <mesh
        geometry={getVoxelGeometry('bonus')}
        material={assets.voxel}
        position={R.BLOCK.position}
        rotation={[0, R.BLOCK.rotationY, 0]}
        scale={R.BLOCK.voxel}
      />
      <group position={R.JOYSTICK.position} rotation={[0, R.JOYSTICK.rotationY, 0]} scale={R.JOYSTICK.scale}>
        <mesh geometry={assets.box} material={assets.base} position={[0, base.y, 0]} scale={[...base.size]} />
        <mesh geometry={assets.box} material={assets.stick} position={[-0.03, stick.y, 0]} scale={[...stick.size]} />
        <mesh geometry={assets.box} material={assets.ball} position={[-0.03, ball.y, 0]} scale={ball.size} />
        <mesh geometry={assets.box} material={assets.ball} position={[buttonOffset, 0.055, 0]} scale={[0.03, 0.015, 0.03]} />
      </group>
    </group>
  );
}
