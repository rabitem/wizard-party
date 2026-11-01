'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  AUTUMN_COLORS,
  AUTUMN_CORN_SHOCKS,
  AUTUMN_CRATES,
  AUTUMN_HAY_BALES,
  AUTUMN_PUMPKINS,
} from '@/presentation/config/autumn-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, InstancedProp, PumpkinPatch, seededRandom, useDisposables, type PropPlacement, type PumpkinPlacement } from '../primitives';
import { createStrawTexture } from './autumn-textures';
import {
  createCornShockGeometry,
  createCrateGeometry,
  createHayBaleGeometry,
  createTwineGeometry,
  CRATE,
  HAY_BALE,
} from './autumn-geometry';

const FLOOR_Y = ENVIRONMENT_ROOM.FLOOR_Y;
const APPLE_RADIUS = 0.07;
const APPLES_PER_CRATE = 14;

const HAY: PropPlacement[] = AUTUMN_HAY_BALES.map(([x, level, z, rotationY]) => ({
  position: [x, FLOOR_Y + level * HAY_BALE.HEIGHT, z],
  rotationY,
}));

const PUMPKINS: PumpkinPlacement[] = AUTUMN_PUMPKINS.map(([x, z, scale, rotationY, colorKey, elongation]) => ({
  position: [x, FLOOR_Y, z],
  scale: [scale, scale * elongation, scale],
  rotationY,
  color: AUTUMN_COLORS[colorKey],
}));

const CRATE_STACKS: PropPlacement[][] = AUTUMN_CRATES.map(([x, z, rotationY, stacked]) => {
  const base: PropPlacement = { position: [x, FLOOR_Y, z], rotationY };
  if (!stacked) return [base];
  return [base, { position: [x + 0.05, FLOOR_Y + CRATE.HEIGHT, z - 0.04], rotationY: rotationY + 0.12 }];
});
const CRATES: PropPlacement[] = CRATE_STACKS.flat();

/** Apples heaped inside the top crate of each stack (deterministic scatter). */
const APPLES: PropPlacement[] = (() => {
  const rand = seededRandom(53);
  const tops = CRATE_STACKS.map((stack) => stack[stack.length - 1]);
  return tops.flatMap((crate) => {
    const rotation = crate.rotationY ?? 0;
    return Array.from({ length: APPLES_PER_CRATE }, () => {
      const lx = (rand() - 0.5) * (CRATE.WIDTH - APPLE_RADIUS * 3);
      const lz = (rand() - 0.5) * (CRATE.DEPTH - APPLE_RADIUS * 3);
      const heap = 1 - Math.hypot(lx / CRATE.WIDTH, lz / CRATE.DEPTH);
      const position: Vec3 = [
        crate.position[0] + Math.cos(rotation) * lx + Math.sin(rotation) * lz,
        crate.position[1] + CRATE.HEIGHT - APPLE_RADIUS * 0.6 + heap * APPLE_RADIUS * 1.6,
        crate.position[2] - Math.sin(rotation) * lx + Math.cos(rotation) * lz,
      ];
      return { position, color: rand() > 0.3 ? AUTUMN_COLORS.appleRed : AUTUMN_COLORS.appleGreen };
    });
  });
})();

const CORN: PropPlacement[] = AUTUMN_CORN_SHOCKS.map(([x, z, scale], i) => ({
  position: [x, FLOOR_Y, z],
  scale,
  rotationY: i * 1.1,
  tilt: [0.06 * (i % 2 === 0 ? 1 : -1), 0.05],
}));

function useHarvestAssets() {
  const geometries = useMemo(
    () => ({
      hay: createHayBaleGeometry(),
      twine: createTwineGeometry(),
      crate: createCrateGeometry(),
      apple: new THREE.SphereGeometry(APPLE_RADIUS, 10, 8),
      corn: createCornShockGeometry(),
    }),
    [],
  );
  const textures = useMemo(() => ({ straw: createStrawTexture() }), []);
  const materials = useMemo(
    () => ({
      hay: addSurfaceDetail(new THREE.MeshStandardMaterial({ map: textures.straw, roughness: 1 }), { scale: 5, normalStrength: 0.9 }),
      twine: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.twine, roughness: 0.9 }), { scale: 12, normalStrength: 0.8 }),
      crate: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.crate, roughness: 0.8 }), { scale: 3, normalStrength: 0.6 }),
      apple: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), { scale: 6, normalStrength: 0.15 }),
      corn: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.corn, roughness: 1, side: THREE.DoubleSide }), { scale: 6, normalStrength: 0.5 }),
    }),
    [textures],
  );
  useDisposables(geometries);
  useDisposables(textures);
  useDisposables(materials);
  return { geometries, materials };
}

/** Straw-textured hay bales, pumpkins and gourds, apple crates and corn shocks around the barn. */
export function HarvestProps() {
  const { geometries, materials } = useHarvestAssets();

  return (
    <group>
      <InstancedProp geometry={geometries.hay} material={materials.hay} placements={HAY} />
      <InstancedProp geometry={geometries.twine} material={materials.twine} placements={HAY} />
      <PumpkinPatch pumpkins={PUMPKINS} skinColor={AUTUMN_COLORS.pumpkin} stemColor={AUTUMN_COLORS.stem} />
      <InstancedProp geometry={geometries.crate} material={materials.crate} placements={CRATES} />
      <InstancedProp geometry={geometries.apple} material={materials.apple} placements={APPLES} />
      <InstancedProp geometry={geometries.corn} material={materials.corn} placements={CORN} />
    </group>
  );
}
