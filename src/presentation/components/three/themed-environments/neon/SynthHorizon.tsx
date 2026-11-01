'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_COLORS, NEON_LAYOUT } from '@/presentation/config/neon-environment.config';
import { getGlowTexture, SceneFog, useDisposables, usePrefersReducedMotion } from '../primitives';
import { createNeonSkyTexture, createNeonSunTexture, createSynthGridTexture } from './neon-textures';

const { SKY_RADIUS, SUN_POSITION, SUN_RADIUS, SUN_STREAK, GRID_Y, GRID_SIZE, GRID_CENTER_Z, GRID_REPEAT } = NEON_LAYOUT;
const SUN_GLOW_SCALE = 4.2;
const SUN_GLOW_OPACITY = 0.7;
const SUN_ALPHA_TEST = 0.5;
const SUN_SEGMENTS = 40;
const STREAK_LIFT = 0.05;

/**
 * Synthwave backdrop: night sky dome with stars, a striped retro sun sitting
 * on the horizon, and a glowing magenta grid plane far below the roof that
 * slowly scrolls towards the viewer (static with reduced motion), with the
 * sun's reflection streaked across it.
 */
export function SynthHorizon() {
  const reducedMotion = usePrefersReducedMotion();
  const gridRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(() => {
    const skyMap = createNeonSkyTexture();
    const sunMap = createNeonSunTexture();
    const gridMap = createSynthGridTexture(GRID_REPEAT);
    return {
      skyMap,
      sunMap,
      gridMap,
      sky: new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false }),
      sun: new THREE.MeshBasicMaterial({ map: sunMap, alphaTest: SUN_ALPHA_TEST, fog: false, toneMapped: false }),
      sunGlow: new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: NEON_COLORS.magenta,
        opacity: SUN_GLOW_OPACITY,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      }),
      grid: new THREE.MeshBasicMaterial({ map: gridMap, toneMapped: false }),
      streak: new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: NEON_COLORS.amber,
        transparent: true,
        opacity: SUN_STREAK.OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      dome: new THREE.SphereGeometry(SKY_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    };
  }, []);
  useDisposables(assets);

  useFrame((_, delta) => {
    const material = gridRef.current?.material;
    if (reducedMotion || !(material instanceof THREE.MeshBasicMaterial) || !material.map) return;
    const { offset } = material.map;
    offset.y = (offset.y + delta * NEON_LAYOUT.GRID_SCROLL_SPEED) % 1;
  });

  const [sunX, sunY, sunZ] = SUN_POSITION;
  const gridFarZ = GRID_CENTER_Z - GRID_SIZE[1] / 2;
  return (
    <group>
      <SceneFog color={NEON_COLORS.fog} near={NEON_LAYOUT.FOG.NEAR} far={NEON_LAYOUT.FOG.FAR} />
      <mesh position={[0, GRID_Y, 0]} geometry={assets.dome} material={assets.sky} renderOrder={-1} />
      <sprite
        position={[sunX, sunY, sunZ - 0.5]}
        scale={[SUN_RADIUS * SUN_GLOW_SCALE, SUN_RADIUS * SUN_GLOW_SCALE, 1]}
        material={assets.sunGlow}
      />
      <mesh position={SUN_POSITION} material={assets.sun}>
        <circleGeometry args={[SUN_RADIUS, SUN_SEGMENTS]} />
      </mesh>
      <mesh ref={gridRef} position={[0, GRID_Y, GRID_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} material={assets.grid}>
        <planeGeometry args={GRID_SIZE} />
      </mesh>
      <mesh
        position={[sunX, GRID_Y + STREAK_LIFT, Math.max(gridFarZ, sunZ) + SUN_STREAK.LENGTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={assets.streak}
      >
        <planeGeometry args={[SUN_STREAK.WIDTH, SUN_STREAK.LENGTH]} />
      </mesh>
    </group>
  );
}
