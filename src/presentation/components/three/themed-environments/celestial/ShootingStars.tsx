'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { CELESTIAL_DOME, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { createShootingStarGeometry, createShootingStarMaterial, type ShootingStarUniforms } from './shooting-star-shader';

/**
 * Occasional meteors streaking across the dome. One draw call: every
 * meteor's random path, timing and fade come from the vertex shader, the CPU
 * only advances uTime. Not rendered for reduced-motion users.
 */
export function ShootingStars() {
  const reducedMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(
    () => ({
      geometry: createShootingStarGeometry(CELESTIAL_REALISM.SHOOTING_STARS.COUNT),
      material: createShootingStarMaterial(),
    }),
    [],
  );
  useDisposables(assets);

  useFrame(({ clock }) => {
    const u = shaderUniforms<ShootingStarUniforms>(meshRef.current);
    if (u) u.uTime.value = clock.getElapsedTime();
  });

  if (reducedMotion) return null;
  return (
    <mesh
      ref={meshRef}
      position={[0, CELESTIAL_DOME.BASE_Y, 0]}
      geometry={assets.geometry}
      material={assets.material}
      frustumCulled={false}
    />
  );
}
