'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_LAYOUT, NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { RIPPLE_FRAGMENT_SHADER, RIPPLE_VERTEX_SHADER } from './neon-shaders';

const { RIPPLES } = NEON_REALISM;
const HALF = NEON_LAYOUT.DECK_HALF - NEON_LAYOUT.PARAPET_DEPTH;

/**
 * Splash rings on the wet deck: one transparent plane whose fragment shader
 * spawns expanding double rings per cell (additive, faded with distance and
 * kept clear of the table). Hidden for reduced motion, where frozen rings
 * would just read as stains.
 */
export function RainRipples() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<THREE.Mesh>(null);
  const assets = useMemo(
    () => ({
      geometry: new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2),
      material: new THREE.ShaderMaterial({
        vertexShader: RIPPLE_VERTEX_SHADER,
        fragmentShader: RIPPLE_FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uCell: { value: RIPPLES.CELL },
          uRate: { value: RIPPLES.RATE },
          uDensity: { value: RIPPLES.DENSITY },
          uMaxRadius: { value: RIPPLES.MAX_RADIUS },
          uColor: { value: new THREE.Color(RIPPLES.COLOR) },
          uOpacity: { value: RIPPLES.OPACITY },
          uClearRadius: { value: RIPPLES.CLEAR_RADIUS },
          uFadeDistance: { value: new THREE.Vector2(...RIPPLES.FADE_DISTANCE) },
          uHalfSize: { value: HALF },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [],
  );
  useDisposables(assets);

  useFrame(({ clock }) => {
    const u = shaderUniforms(ref.current);
    if (u) u.uTime.value = clock.getElapsedTime();
  });

  if (reducedMotion) return null;
  return (
    <mesh
      ref={ref}
      position={[0, ENVIRONMENT_ROOM.FLOOR_Y + RIPPLES.LIFT, 0]}
      geometry={assets.geometry}
      material={assets.material}
      renderOrder={1}
    />
  );
}
