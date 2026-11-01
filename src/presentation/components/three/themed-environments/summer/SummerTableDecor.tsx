'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  SUMMER_COLORS,
  SUMMER_RIM_CONCHS,
  SUMMER_RIM_GLASS,
  SUMMER_RIM_SCALLOPS,
  SUMMER_RIM_STARFISH,
} from '@/presentation/config/summer-environment.config';
import { InstancedProp, useDisposables } from '../primitives';
import { createConchGeometry, createScallopGeometry, createStarfishGeometry } from './summer-geometry';

const GLASS = { RADIUS: 0.055, HEIGHT: 0.16, WALL: 0.006, FILL: 0.75 } as const;
const LEMON = { RADIUS: 0.038, THICKNESS: 0.008 } as const;
const STRAW = { RADIUS: 0.005, LENGTH: 0.22, TILT: 0.25 } as const;
const ICE_SIZE = 0.028;
const SEGMENTS = 14;

type GlassMaterials = Record<'glass' | 'lemonade' | 'lemon' | 'straw' | 'ice', THREE.Material>;

/** Small glass of lemonade: glass, liquid, ice cubes, a lemon wheel on the rim and a straw. */
function LemonadeGlass({ materials }: { materials: GlassMaterials }) {
  const liquidHeight = GLASS.HEIGHT * GLASS.FILL;
  return (
    <group position={SUMMER_RIM_GLASS.position} rotation={[0, SUMMER_RIM_GLASS.rotationY, 0]}>
      <mesh position={[0, liquidHeight / 2 + GLASS.WALL, 0]} material={materials.lemonade}>
        <cylinderGeometry args={[GLASS.RADIUS - GLASS.WALL, GLASS.RADIUS * 0.85 - GLASS.WALL, liquidHeight, SEGMENTS]} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={`ice-${i}`} position={[i ? 0.015 : -0.012, liquidHeight - 0.004, i ? -0.01 : 0.012]} rotation={[0.3 * i, 0.6 + i, 0.2]} material={materials.ice}>
          <boxGeometry args={[ICE_SIZE, ICE_SIZE, ICE_SIZE]} />
        </mesh>
      ))}
      <mesh position={[0, GLASS.HEIGHT / 2, 0]} material={materials.glass}>
        <cylinderGeometry args={[GLASS.RADIUS, GLASS.RADIUS * 0.85, GLASS.HEIGHT, SEGMENTS, 1, true]} />
      </mesh>
      <mesh position={[GLASS.RADIUS * 0.9, GLASS.HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0.3]} material={materials.lemon}>
        <cylinderGeometry args={[LEMON.RADIUS, LEMON.RADIUS, LEMON.THICKNESS, 12]} />
      </mesh>
      <mesh position={[-0.015, GLASS.HEIGHT * 0.75, 0]} rotation={[0, 0, STRAW.TILT]} material={materials.straw}>
        <cylinderGeometry args={[STRAW.RADIUS, STRAW.RADIUS, STRAW.LENGTH, 5]} />
      </mesh>
    </group>
  );
}

/**
 * Seashells, a starfish and a lemonade glass on the wood rim. Visual only
 * (no colliders), in the safe rim slots outside the play area.
 */
export function SummerTableDecor() {
  const assets = useMemo(
    () => ({
      scallop: createScallopGeometry(),
      conch: createConchGeometry(),
      starfish: createStarfishGeometry(),
      shell: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
      glass: new THREE.MeshStandardMaterial({
        color: SUMMER_COLORS.glass,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      lemonade: new THREE.MeshStandardMaterial({
        color: SUMMER_COLORS.lemonade,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
        emissive: SUMMER_COLORS.lemonade,
        emissiveIntensity: 0.2,
      }),
      lemon: new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.lemon, roughness: 0.6 }),
      straw: new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.straw, roughness: 0.5 }),
      ice: new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.ice, roughness: 0.1, transparent: true, opacity: 0.7 }),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.scallop} material={assets.shell} placements={SUMMER_RIM_SCALLOPS} />
      <InstancedProp geometry={assets.conch} material={assets.shell} placements={SUMMER_RIM_CONCHS} />
      <InstancedProp geometry={assets.starfish} material={assets.shell} placements={SUMMER_RIM_STARFISH} />
      <LemonadeGlass materials={assets} />
    </group>
  );
}
