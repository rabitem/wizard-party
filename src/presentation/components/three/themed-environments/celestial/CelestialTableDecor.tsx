'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  CELESTIAL_COLORS,
  CELESTIAL_RIM_ASTROLABE,
  CELESTIAL_RIM_CANDLES,
  CELESTIAL_RIM_CRYSTAL,
  CELESTIAL_RIM_STARS,
} from '@/presentation/config/celestial-environment.config';
import { CandleCluster, InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createStarCrystalGeometry } from './celestial-geometry';
import { createGoldMaterial } from './celestial-materials';

const STAR_CRYSTAL_RADIUS = 0.035;
const RIM_STARS: PropPlacement[] = CELESTIAL_RIM_STARS.map((star) => ({ ...star }));

/**
 * Tiny observatory curios on the wood rim: candles, a miniature crystal
 * ball, an upright astrolabe and gold star crystals. Visual only (no
 * colliders), in the safe rim slots outside the play area.
 */
export function CelestialTableDecor() {
  const assets = useMemo(
    () => ({
      gold: createGoldMaterial({ emissiveIntensity: 0.45, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({
        color: CELESTIAL_COLORS.crystal,
        emissive: CELESTIAL_COLORS.crystal,
        emissiveIntensity: 0.7,
        roughness: 0.05,
        transparent: true,
        opacity: 0.75,
      }),
      star: createStarCrystalGeometry(STAR_CRYSTAL_RADIUS),
      ball: new THREE.SphereGeometry(CELESTIAL_RIM_CRYSTAL.radius, 16, 12),
      stand: new THREE.CylinderGeometry(CELESTIAL_RIM_CRYSTAL.radius * 0.6, CELESTIAL_RIM_CRYSTAL.radius * 0.8, 0.04, 12),
      disc: new THREE.CylinderGeometry(CELESTIAL_RIM_ASTROLABE.radius, CELESTIAL_RIM_ASTROLABE.radius, 0.012, 20),
      ring: new THREE.TorusGeometry(CELESTIAL_RIM_ASTROLABE.radius * 1.05, 0.008, 4, 24),
      foot: new THREE.BoxGeometry(0.08, 0.02, 0.05),
    }),
    [],
  );
  useDisposables(assets);

  const [cx, cy, cz] = CELESTIAL_RIM_CRYSTAL.position;
  const astro = CELESTIAL_RIM_ASTROLABE;
  return (
    <group>
      <CandleCluster
        candles={CELESTIAL_RIM_CANDLES}
        waxColor={CELESTIAL_COLORS.candleWax}
        flameColor={CELESTIAL_COLORS.candleFlame}
        glowColor={CELESTIAL_COLORS.candleGlow}
        glowStrength={0.45}
      />
      <InstancedProp geometry={assets.star} material={assets.gold} placements={RIM_STARS} />

      <group position={[cx, cy, cz]}>
        <mesh geometry={assets.stand} material={assets.gold} position={[0, 0.02, 0]} />
        <mesh geometry={assets.ball} material={assets.glass} position={[0, 0.04 + CELESTIAL_RIM_CRYSTAL.radius * 0.9, 0]} />
      </group>

      {/* Upright astrolabe: disc faces the table centre, on a small foot */}
      <group position={astro.position} rotation={[0, astro.rotationY, 0]}>
        <mesh geometry={assets.disc} material={assets.gold} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={assets.ring} material={assets.gold} />
        <mesh geometry={assets.foot} material={assets.gold} position={[0, -astro.radius - 0.005, 0]} />
      </group>
    </group>
  );
}
