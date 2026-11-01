'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  WINTER_COLORS,
  WINTER_LAYOUT,
  WINTER_LIGHTS,
  WINTER_MANTEL_CANDLES,
} from '@/presentation/config/winter-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  CandleCluster,
  createPbrMaterial,
  InstancedProp,
  RealisticParticleField,
  seededRandom,
  useDisposables,
  type CandlePlacement,
  type PropPlacement,
} from '../primitives';
import { HearthFire, type HearthFireColors } from '../primitives/HearthFire';

const HEARTH = { WIDTH: 3.6, HEIGHT: 2.7, DEPTH: 1.0, OPENING_W: 2.0, OPENING_H: 1.35, CHIMNEY_W: 2.3, CHIMNEY_H: 7.4 } as const;
const MANTEL = { HEIGHT: 0.16, OVERHANG: 0.4, DEPTH_EXTRA: 0.35 } as const;
const MANTEL_TOP = HEARTH.HEIGHT + MANTEL.HEIGHT;
/** Front face of the mantel shelf (centre DEPTH/2 + EXTRA/4, depth DEPTH + EXTRA) */
const MANTEL_FRONT_Z = HEARTH.DEPTH + MANTEL.DEPTH_EXTRA * 0.75;
const GARLAND = { LEAVES: 26, BERRIES: 9, SAG: 0.22, LEAF_SIZE: 0.11, BERRY_SIZE: 0.04 } as const;
const STOCKING_X = [-0.9, 0, 0.9] as const;
const OPENING_HALF_W = HEARTH.OPENING_W * 0.38;

/** Sparks rising from the logs up into the flue (fireplace-local; the opening faces +z). */
const EMBER_VOLUME = { center: [0, 0, 0.05] as Vec3, halfSize: [OPENING_HALF_W, 0.32] as const, bottom: 0.2, top: HEARTH.OPENING_H + 0.5 };
const EMBER_COLORS = [WINTER_COLORS.flame, WINTER_COLORS.ember, WINTER_COLORS.candleFlame] as const;

const FIRE_COLORS: HearthFireColors = {
  log: WINTER_COLORS.log,
  logGlow: WINTER_COLORS.logGlow,
  flame: WINTER_COLORS.flame,
  ember: WINTER_COLORS.ember,
  glow: WINTER_COLORS.fireGlow,
};

/** Garland swag draped along the mantel front: leaf clumps plus red berries. */
const GARLAND_LEAVES: PropPlacement[] = (() => {
  const rand = seededRandom(61);
  const span = HEARTH.WIDTH + MANTEL.OVERHANG;
  return Array.from({ length: GARLAND.LEAVES }, (_, i) => {
    const t = i / (GARLAND.LEAVES - 1);
    const sag = Math.sin(t * Math.PI * 3) ** 2 * GARLAND.SAG;
    return {
      position: [(t - 0.5) * span, HEARTH.HEIGHT - 0.04 - sag, MANTEL_FRONT_Z + 0.04] as Vec3,
      scale: 0.8 + rand() * 0.5,
      rotationY: rand() * Math.PI,
      tilt: [rand(), rand()] as [number, number],
    };
  });
})();
const GARLAND_BERRIES: PropPlacement[] = GARLAND_LEAVES.filter((_, i) => i % 3 === 1).slice(0, GARLAND.BERRIES).map((leaf) => ({
  position: [leaf.position[0] + 0.05, leaf.position[1] - 0.04, leaf.position[2] + 0.07] as Vec3,
}));

/** Stocking parts (unit boxes): leg, foot and cuff per stocking. */
const STOCKING_LEGS: PropPlacement[] = STOCKING_X.map((x, i) => ({
  position: [x, HEARTH.HEIGHT - 0.55, MANTEL_FRONT_Z + 0.02],
  scale: [0.22, 0.5, 0.08],
  color: i % 2 === 0 ? WINTER_COLORS.stocking : WINTER_COLORS.stockingAlt,
}));
const STOCKING_FEET: PropPlacement[] = STOCKING_X.map((x, i) => ({
  position: [x + 0.08, HEARTH.HEIGHT - 0.78, MANTEL_FRONT_Z + 0.02],
  scale: [0.36, 0.16, 0.08],
  color: i % 2 === 0 ? WINTER_COLORS.stocking : WINTER_COLORS.stockingAlt,
}));
const STOCKING_CUFFS: PropPlacement[] = STOCKING_X.map((x) => ({
  position: [x, HEARTH.HEIGHT - 0.27, MANTEL_FRONT_Z + 0.03],
  scale: [0.27, 0.12, 0.1],
}));

const MANTEL_CANDLES: CandlePlacement[] = WINTER_MANTEL_CANDLES.map(([x, height]) => ({
  position: [x, MANTEL_TOP, HEARTH.DEPTH / 2 + 0.1] as Vec3,
  height,
  scale: 1.2,
}));

/**
 * Stone fireplace on the lodge's side wall: chimney breast, timber mantel
 * with garland, stockings and candles, plus the crackling fire with GPU
 * sparks (the room's main warm light lives in HearthFire). Flames and
 * candles are unlit HDR colours, so the room's bloom catches them.
 */
export function LodgeFireplace() {
  const assets = useMemo(
    () => ({
      stone: createPbrMaterial('stone', { color: WINTER_COLORS.stone, accent: WINTER_COLORS.mortar, repeat: [1.5, 1.5], seed: 71, normalScale: 1 }),
      soot: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.soot, roughness: 1 }), { scale: 3, normalStrength: 0.6 }),
      mantel: createPbrMaterial('wood', { color: WINTER_COLORS.mantel, repeat: [2, 1], seed: 17 }),
      garland: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.garland, roughness: 0.85, flatShading: true }),
      berry: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.berry, roughness: 0.4 }),
      stocking: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }),
      cuff: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.stockingCuff, roughness: 1 }),
      box: new THREE.BoxGeometry(1, 1, 1),
      leaf: new THREE.IcosahedronGeometry(GARLAND.LEAF_SIZE, 0),
      berryGeometry: new THREE.SphereGeometry(GARLAND.BERRY_SIZE, 6, 4),
    }),
    [],
  );
  useDisposables(assets);

  const sideWidth = (HEARTH.WIDTH - HEARTH.OPENING_W) / 2;
  const { WIDTH, HEIGHT, DEPTH, OPENING_H, OPENING_W } = HEARTH;
  return (
    <group position={WINTER_LAYOUT.FIREPLACE_POSITION} rotation={[0, WINTER_LAYOUT.FIREPLACE_ROTATION, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={`jamb-${side}`} position={[side * (WIDTH / 2 - sideWidth / 2), HEIGHT / 2, DEPTH / 2]} material={assets.stone}>
          <boxGeometry args={[sideWidth, HEIGHT, DEPTH]} />
        </mesh>
      ))}
      <mesh position={[0, (HEIGHT + OPENING_H) / 2, DEPTH / 2]} material={assets.stone}>
        <boxGeometry args={[OPENING_W, HEIGHT - OPENING_H, DEPTH]} />
      </mesh>
      <mesh position={[0, OPENING_H / 2, 0.15]} material={assets.soot}>
        <boxGeometry args={[OPENING_W, OPENING_H, 0.3]} />
      </mesh>
      <mesh position={[0, HEIGHT + HEARTH.CHIMNEY_H / 2, 0.35]} material={assets.stone}>
        <boxGeometry args={[HEARTH.CHIMNEY_W, HEARTH.CHIMNEY_H, 0.7]} />
      </mesh>
      <mesh position={[0, HEIGHT + MANTEL.HEIGHT / 2, DEPTH / 2 + MANTEL.DEPTH_EXTRA / 4]} material={assets.mantel}>
        <boxGeometry args={[WIDTH + MANTEL.OVERHANG, MANTEL.HEIGHT, DEPTH + MANTEL.DEPTH_EXTRA]} />
      </mesh>
      <mesh position={[0, 0.05, DEPTH + 0.35]} material={assets.stone}>
        <boxGeometry args={[WIDTH + 0.6, 0.1, 0.7]} />
      </mesh>

      <InstancedProp geometry={assets.leaf} material={assets.garland} placements={GARLAND_LEAVES} />
      <InstancedProp geometry={assets.berryGeometry} material={assets.berry} placements={GARLAND_BERRIES} />
      <InstancedProp geometry={assets.box} material={assets.stocking} placements={STOCKING_LEGS} />
      <InstancedProp geometry={assets.box} material={assets.stocking} placements={STOCKING_FEET} />
      <InstancedProp geometry={assets.box} material={assets.cuff} placements={STOCKING_CUFFS} />
      <CandleCluster candles={MANTEL_CANDLES} waxColor={WINTER_COLORS.wax} flameColor={WINTER_COLORS.candleFlame} glowColor={WINTER_COLORS.candleGlow} />

      <group position={[0, 0, DEPTH * 0.55]}>
        <HearthFire width={OPENING_W} colors={FIRE_COLORS} emberCount={0} light={WINTER_LIGHTS.fire} seed={23} />
        <RealisticParticleField
          kind="embers"
          volume={EMBER_VOLUME}
          count={WINTER_LAYOUT.EMBER_COUNT}
          colors={EMBER_COLORS}
          clearRadius={0}
          seed={29}
        />
      </group>
    </group>
  );
}
