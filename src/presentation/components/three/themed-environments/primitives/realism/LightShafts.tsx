'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LIGHT_SHAFTS } from '@/presentation/config/realism.config';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useDisposables } from '../useDisposables';
import { createShaftGeometry, type LightShaft } from './atmosphere-geometry';
import { LIGHT_SHAFT_FRAGMENT_SHADER, LIGHT_SHAFT_VERTEX_SHADER } from './atmosphere-shaders';
import { getFogNoiseTexture } from './noise-texture';
import { RealisticParticleField, type ParticleVolume } from './RealisticParticleField';
import { shaderUniforms } from './shader-uniforms';

export type { LightShaft };

export interface LightShaftsProps {
  /** Keep this array stable (module constant or useMemo): a new array rebuilds the geometry */
  shafts: readonly LightShaft[];
  color?: string;
  /** Peak additive brightness (keep subtle: 0.08 - 0.3) */
  intensity?: number;
  /** Dust motes drifting through the beams */
  dust?: ParticleVolume;
  dustCount?: number;
}

/**
 * Cheap god rays: additive open cones with a soft view-angle edge falloff,
 * a gradient along the beam and slow noise shimmer, plus optional dust motes.
 * One draw call for all shafts; no post pass, no shadows.
 */
export function LightShafts({ shafts, color = '#fff1d0', intensity = 0.16, dust, dustCount }: LightShaftsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);

  const resources = useMemo(
    () => ({
      geometry: createShaftGeometry(shafts),
      material: new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uColor: { value: new THREE.Color() },
          uIntensity: { value: 0 },
          uTime: { value: 0 },
          uEdgeSoftness: { value: LIGHT_SHAFTS.EDGE_SOFTNESS },
          uNoise: { value: getFogNoiseTexture() },
        },
        vertexShader: LIGHT_SHAFT_VERTEX_SHADER,
        fragmentShader: LIGHT_SHAFT_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    }),
    [shafts],
  );
  useDisposables(resources);

  useLayoutEffect(() => {
    const uniforms = shaderUniforms(meshRef.current);
    if (!uniforms) return;
    uniforms.uColor.value.set(color);
    // Double-sided: front and back faces both add, so halve the peak.
    uniforms.uIntensity.value = intensity * 0.5;
  }, [resources, color, intensity]);

  useFrame(({ clock }) => {
    const uniforms = shaderUniforms(meshRef.current);
    if (uniforms && !reducedMotion) uniforms.uTime.value = clock.getElapsedTime() * 0.03;
  });

  return (
    <>
      <mesh ref={meshRef} geometry={resources.geometry} material={resources.material} />
      {dust ? (
        <RealisticParticleField kind="dust" volume={dust} count={dustCount} colors={[color, '#ffffff']} clearRadius={0} />
      ) : null}
    </>
  );
}
