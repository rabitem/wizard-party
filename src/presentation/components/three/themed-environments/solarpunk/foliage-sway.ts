'use client';

import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { usePrefersReducedMotion } from '../primitives';
import { setTimeUniform } from './solarpunk-animation';

/**
 * Gentle wind sway for foliage, done in the vertex shader of an existing
 * MeshStandardMaterial (onBeforeCompile), so instanced leaves, fronds and
 * blossom clumps move without any per-instance JS work. Vertices further
 * from the local origin (leaf tips) move more; each instance gets its own
 * phase from its position. Shared by the solarpunk and spring rooms.
 */

export interface FoliageSwayOptions {
  /** Displacement (local units) at `reach` from the origin */
  amplitude: number;
  /** Sway speed (rad/s) */
  frequency: number;
  /** Local distance at which the full amplitude applies */
  reach?: number;
}

export interface SwayUniforms {
  uSwayTime: THREE.IUniform<number>;
  uSwayAmp: THREE.IUniform<number>;
  uSwayFreq: THREE.IUniform<number>;
  uSwayReach: THREE.IUniform<number>;
}

const SWAY_PARS = /* glsl */ `
uniform float uSwayTime;
uniform float uSwayAmp;
uniform float uSwayFreq;
uniform float uSwayReach;
`;

const SWAY_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  vec3 swayOrigin = vec3(0.0);
  #ifdef USE_INSTANCING
    swayOrigin = instanceMatrix[3].xyz;
  #endif
  float swayPhase = dot(swayOrigin, vec3(0.73, 0.31, 0.51)) * 1.7;
  float swayWeight = clamp(length(position) / uSwayReach, 0.0, 1.0);
  swayWeight *= swayWeight;
  float swayT = uSwayTime * uSwayFreq + swayPhase;
  float swayX = sin(swayT) + 0.35 * sin(swayT * 2.3 + 1.7);
  float swayZ = cos(swayT * 0.8 + 0.6) * 0.6;
  transformed.xz += vec2(swayX, swayZ) * uSwayAmp * swayWeight;
}
`;

/** Patches `material` to sway; returns the uniforms to drive with useSwayClock. */
export function addFoliageSway(material: THREE.MeshStandardMaterial, options: FoliageSwayOptions): SwayUniforms {
  const uniforms: SwayUniforms = {
    uSwayTime: { value: 0 },
    uSwayAmp: { value: options.amplitude },
    uSwayFreq: { value: options.frequency },
    uSwayReach: { value: options.reach ?? 1 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = SWAY_PARS + shader.vertexShader.replace('#include <begin_vertex>', SWAY_VERTEX);
  };
  material.customProgramCacheKey = () => 'foliage-sway';
  return uniforms;
}

/** Advances every sway clock each frame; frozen (no sway) for reduced motion. */
export function useSwayClock(list: readonly SwayUniforms[]): void {
  const reducedMotion = usePrefersReducedMotion();
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime();
    for (const uniforms of list) setTimeUniform(uniforms.uSwayTime, time);
  });
}
