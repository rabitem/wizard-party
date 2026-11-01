'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PIXEL_COLORS, PIXEL_PRIZE_COLORS, PIXEL_PRIZE_COUNTER as P } from '@/presentation/config/pixel-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import {
  GlowSprites,
  InstancedProp,
  MatrixInstances,
  createGlowMaterial,
  localMatrix,
  seededRandom,
  useDisposables,
  type PropPlacement,
} from '../primitives';
import { createPrizeSignTexture } from './pixel-textures';
import { SpinningCoins } from './SpinningCoins';
import { getVoxelGeometry } from './voxel-models';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const [CX, , CZ] = P.CENTER;
/** The counter faces the room (-x) */
const FRONT_X = CX - P.DEPTH / 2;
const BULB_STEP = 0.4;
const SHELF_THICKNESS = 0.06;

const COUNTER_TOP_Y = FLOOR + P.HEIGHT;

const BULBS = (() => {
  const matrices: THREE.Matrix4[] = [];
  const colors: string[] = [];
  for (let z = -P.LENGTH / 2 + 0.2, i = 0; z <= P.LENGTH / 2 - 0.2; z += BULB_STEP, i++) {
    matrices.push(localMatrix([FRONT_X - 0.01, FLOOR + P.HEIGHT - 0.22, CZ + z], [0, 0, 0], [0.04, 0.09, 0.09]));
    matrices.push(localMatrix([FRONT_X - 0.01, FLOOR + 0.3, CZ + z], [0, 0, 0], [0.04, 0.09, 0.09]));
    colors.push(i % 2 === 0 ? PIXEL_COLORS.signBulb : PIXEL_COLORS.counterTop, i % 2 === 0 ? PIXEL_COLORS.stripeB : PIXEL_COLORS.signBulb);
  }
  return { matrices, colors };
})();

/** Coloured prize boxes on the lower shelves and inside the glass case */
const PRIZE_BOXES: PropPlacement[] = (() => {
  const rand = seededRandom(31);
  const boxes: PropPlacement[] = [];
  P.SHELF_HEIGHTS.slice(0, 2).forEach((height, shelf) => {
    for (let i = 0; i < P.PRIZES_PER_SHELF; i++) {
      const size: Vec3 = [0.25 + rand() * 0.2, 0.25 + rand() * 0.3, 0.3 + rand() * 0.25];
      const z = CZ - P.LENGTH / 2 + 0.45 + (i * (P.LENGTH - 0.9)) / (P.PRIZES_PER_SHELF - 1);
      boxes.push({
        position: [P.SHELF_X, FLOOR + height + SHELF_THICKNESS / 2 + size[1] / 2, z],
        scale: size,
        rotationY: (rand() - 0.5) * 0.4,
        color: PIXEL_PRIZE_COLORS[(i + shelf * 3) % PIXEL_PRIZE_COLORS.length],
      });
    }
  });
  for (let i = 0; i < 6; i++) {
    const s = 0.16 + rand() * 0.1;
    boxes.push({
      position: [CX + (rand() - 0.5) * 0.4, COUNTER_TOP_Y + 0.08 + s / 2, CZ - 2.2 + i * 0.88],
      scale: s,
      rotationY: rand(),
      color: PIXEL_PRIZE_COLORS[(i + 2) % PIXEL_PRIZE_COLORS.length],
    });
  }
  return boxes;
})();

const SHELVES: PropPlacement[] = P.SHELF_HEIGHTS.map((height) => ({
  position: [P.SHELF_X, FLOOR + height, CZ],
  scale: [P.SHELF_DEPTH, SHELF_THICKNESS, P.LENGTH],
}));

/** Voxel plush on the top shelf */
const TOP_SHELF_Y = FLOOR + P.SHELF_HEIGHTS[2] + SHELF_THICKNESS / 2;
const PLUSH_MUSHROOMS: PropPlacement[] = [-1.9, 0, 1.9].map((dz, i) => ({
  position: [P.SHELF_X, TOP_SHELF_Y, CZ + dz],
  scale: 0.05 - i * 0.004,
  rotationY: -Math.PI / 2 + (i - 1) * 0.3,
}));
const PLUSH_HEARTS: PropPlacement[] = [-0.95, 0.95].map((dz) => ({
  position: [P.SHELF_X, TOP_SHELF_Y + 0.22, CZ + dz],
  scale: 0.05,
  rotationY: -Math.PI / 2,
}));

const COIN_POSITIONS: Vec3[] = Array.from({ length: P.COIN_COUNT }, (_, i) => [
  CX,
  FLOOR + P.COIN_HEIGHT,
  CZ + (i - (P.COIN_COUNT - 1) / 2) * 1.1,
]);
const SIGN_GLOW = [{ position: [P.SIGN_CENTER[0] - 0.5, P.SIGN_CENTER[1], P.SIGN_CENTER[2]] as Vec3, scale: 3.4 }];

/**
 * Prize corner: a glass-topped counter trimmed with bulbs, prize shelves on
 * the wall, voxel plush, a pixel "PRIZES" sign and coins spinning above.
 */
export function PrizeCounter() {
  const assets = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      sign: new THREE.PlaneGeometry(...P.SIGN_SIZE),
      signTexture: createPrizeSignTexture(),
      body: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.counterBody, roughness: 0.6 }),
      top: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.counterTop, roughness: 0.4, emissive: PIXEL_COLORS.counterTop, emissiveIntensity: 0.15 }),
      glass: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.glass, roughness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
      shelf: new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.shelf, roughness: 0.8 }),
      prize: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
      voxel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
      bulb: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      glow: createGlowMaterial(PIXEL_COLORS.signBulb, 0.22),
    }),
    [],
  );
  const signMaterial = useMemo(() => ({ sign: new THREE.MeshBasicMaterial({ map: assets.signTexture, toneMapped: false }) }), [assets.signTexture]);
  useDisposables(assets);
  useDisposables(signMaterial);

  return (
    <group>
      <mesh geometry={assets.box} material={assets.body} position={[CX, FLOOR + P.HEIGHT / 2, CZ]} scale={[P.DEPTH, P.HEIGHT, P.LENGTH]} />
      <mesh geometry={assets.box} material={assets.top} position={[CX, COUNTER_TOP_Y + 0.04, CZ]} scale={[P.DEPTH + 0.16, 0.08, P.LENGTH + 0.16]} />
      <InstancedProp geometry={assets.box} material={assets.prize} placements={PRIZE_BOXES} />
      <mesh
        geometry={assets.box}
        material={assets.glass}
        position={[CX, COUNTER_TOP_Y + 0.08 + P.GLASS_HEIGHT / 2, CZ]}
        scale={[P.DEPTH - 0.2, P.GLASS_HEIGHT, P.LENGTH - 0.4]}
      />
      <MatrixInstances geometry={assets.box} material={assets.bulb} matrices={BULBS.matrices} colors={BULBS.colors} />

      <InstancedProp geometry={assets.box} material={assets.shelf} placements={SHELVES} />
      <InstancedProp geometry={getVoxelGeometry('mushroom')} material={assets.voxel} placements={PLUSH_MUSHROOMS} />
      <InstancedProp geometry={getVoxelGeometry('heart', 'center')} material={assets.voxel} placements={PLUSH_HEARTS} />

      <mesh geometry={assets.sign} material={signMaterial.sign} position={P.SIGN_CENTER} rotation={[0, -Math.PI / 2, 0]} />
      <GlowSprites points={SIGN_GLOW} material={assets.glow} />

      <SpinningCoins positions={COIN_POSITIONS} scale={P.COIN_SCALE} spinSpeed={P.COIN_SPIN_SPEED} bob={P.COIN_BOB} />
    </group>
  );
}
