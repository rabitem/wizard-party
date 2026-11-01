'use client';

import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { setTimeUniform } from './solarpunk-animation';

/**
 * Advances `uTime` on the ShaderMaterials of the given meshes / points each
 * frame (scaled by `speed`). Frozen at time 0 for reduced motion, so water
 * and caustics render as a still frame.
 */
export function useShaderTime(refs: ReadonlyArray<RefObject<THREE.Object3D | null>>, speed = 1): void {
  const reducedMotion = usePrefersReducedMotion();
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime() * speed;
    for (const ref of refs) {
      const uniforms = shaderUniforms(ref.current);
      if (uniforms?.uTime) setTimeUniform(uniforms.uTime, time);
    }
  });
}
