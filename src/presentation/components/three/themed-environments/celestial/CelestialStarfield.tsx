'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { useDeviceTier, useDisposables, usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { createStarfieldGeometry, createStarfieldMaterial, type StarfieldUniforms } from './starfield-shader';

const S = CELESTIAL_REALISM.STARFIELD;
/** Frozen time for reduced motion: a fixed, varied twinkle state. */
const FROZEN_TIME = 11;

/**
 * Deep twinkling starfield on the dome: one THREE.Points draw call, the
 * twinkle runs in the vertex shader (the CPU only advances uTime). Mount it
 * inside the rotating sky group so it wheels with the constellations and the
 * milky way. Count scales with the device tier.
 */
export function CelestialStarfield() {
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const pointsRef = useRef<THREE.Points>(null);

  const assets = useMemo(
    () => ({ geometry: createStarfieldGeometry(S.COUNT[tier]), material: createStarfieldMaterial() }),
    [tier],
  );
  useDisposables(assets);

  useLayoutEffect(() => {
    const u = shaderUniforms<StarfieldUniforms>(pointsRef.current);
    if (u && reducedMotion) u.uTime.value = FROZEN_TIME;
  }, [assets, reducedMotion]);

  useFrame((state) => {
    const u = shaderUniforms<StarfieldUniforms>(pointsRef.current);
    if (!u) return;
    const dpr = state.viewport.dpr;
    u.uViewportHeight.value = state.size.height * dpr;
    u.uMaxSize.value = S.MAX_POINT_SIZE * dpr;
    if (!reducedMotion) u.uTime.value = state.clock.getElapsedTime();
  });

  return <points ref={pointsRef} geometry={assets.geometry} material={assets.material} frustumCulled={false} />;
}
