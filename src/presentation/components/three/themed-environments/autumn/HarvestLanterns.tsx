'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { AUTUMN_COLORS, AUTUMN_HANGING_LANTERNS, AUTUMN_LANTERNS } from '@/presentation/config/autumn-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import {
  createFlameMaterial,
  createGlowMaterial,
  GlowSprites,
  InstancedProp,
  useDisposables,
  useFlicker,
  type PropPlacement,
} from '../primitives';
import { createLanternFrameGeometry, createLanternGlassGeometry, LANTERN } from './autumn-geometry';

const CHAIN_TOP = ENVIRONMENT_ROOM.FLOOR_Y + ENVIRONMENT_ROOM.HEIGHT - 0.75;
const HANG_SCALE = 1.4;
const GLOW_SCALE = 1.1;

const PLACEMENTS: PropPlacement[] = [
  ...AUTUMN_LANTERNS.map(([x, y, z, scale], i) => ({ position: [x, y, z] as Vec3, scale, rotationY: i * 0.7 })),
  ...AUTUMN_HANGING_LANTERNS.map((position, i) => ({ position, scale: HANG_SCALE, rotationY: i * 0.5 })),
];

const GLOWS = PLACEMENTS.map((p) => {
  const scale = typeof p.scale === 'number' ? p.scale : 1;
  return {
    position: [p.position[0], p.position[1] + (LANTERN.HEIGHT / 2) * scale, p.position[2]] as Vec3,
    scale: GLOW_SCALE * scale,
  };
});

/** Chains from the purlins down to each hanging lantern. */
const CHAINS = AUTUMN_HANGING_LANTERNS.map(([x, y, z]) => {
  const top = y + (LANTERN.HEIGHT + LANTERN.CAP * 2) * HANG_SCALE;
  const length = Math.max(0.1, CHAIN_TOP - top);
  return { id: `chain-${x}-${z}`, position: [x, top + length / 2, z] as Vec3, length };
});

/** Iron lanterns with warm flickering glass: on the floor, on hay and crates, and hanging from beams. */
export function HarvestLanterns() {
  const assets = useMemo(
    () => ({
      frame: createLanternFrameGeometry(),
      glass: createLanternGlassGeometry(),
      metal: new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.lanternMetal, roughness: 0.5, metalness: 0.7 }),
      glassMaterial: createFlameMaterial(AUTUMN_COLORS.lanternGlass, 0.9),
      glow: createGlowMaterial(AUTUMN_COLORS.lanternGlow, 0.6),
    }),
    [],
  );
  useDisposables(assets);

  const flickerTargets = useMemo(
    () => [
      { material: assets.glassMaterial, base: 0.9, amplitude: 0.08, useOpacity: true },
      { material: assets.glow, base: 0.6, amplitude: 0.2, phase: 0.8, useOpacity: true },
    ],
    [assets],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <InstancedProp geometry={assets.frame} material={assets.metal} placements={PLACEMENTS} />
      <InstancedProp geometry={assets.glass} material={assets.glassMaterial} placements={PLACEMENTS} />
      <GlowSprites points={GLOWS} material={assets.glow} />
      {CHAINS.map((chain) => (
        <mesh key={chain.id} position={chain.position} material={assets.metal}>
          <cylinderGeometry args={[0.012, 0.012, chain.length, 4]} />
        </mesh>
      ))}
    </group>
  );
}
