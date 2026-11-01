'use client';

import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { writeInstances, type PropPlacement } from './instancing';

interface InstancedPropProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  placements: readonly PropPlacement[];
  /** Local offset applied after each placement (for sub-parts like stems) */
  offset?: THREE.Matrix4;
  receiveShadow?: boolean;
}

/** Renders every placement of one geometry/material pair in a single draw call. */
export function InstancedProp({ geometry, material, placements, offset, receiveShadow = false }: InstancedPropProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    writeInstances(ref.current, placements, offset);
  }, [placements, offset, geometry, material]);

  if (placements.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, placements.length]}
      receiveShadow={receiveShadow}
    />
  );
}
