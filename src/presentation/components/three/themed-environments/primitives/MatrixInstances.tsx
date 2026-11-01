'use client';

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

interface MatrixInstancesProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Precomputed world matrices (for props whose transforms are not simple placements) */
  matrices: readonly THREE.Matrix4[];
  /** Optional per-instance colours (needs a white base material colour) */
  colors?: readonly string[];
}

/** One draw call for arbitrary precomputed transforms (curved trunks, fronds, garlands). */
export function MatrixInstances({ geometry, material, matrices, colors }: MatrixInstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    matrices.forEach((matrix, i) => {
      mesh.setMatrixAt(i, matrix);
      if (colors?.length) mesh.setColorAt(i, color.set(colors[i % colors.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices, colors, geometry, material]);

  if (matrices.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} />;
}
