'use client';

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { ringInstanceMatrices, type PartTransform, type RingLayout } from './ring-instances';

interface InstancedRingPartProps extends PartTransform {
  layout: RingLayout;
  /** Geometry and material of one copy */
  children: ReactNode;
}

/**
 * One decorative part repeated around a ring, drawn as a single InstancedMesh.
 * Children are the geometry and material of one copy, as for a plain mesh.
 */
export function InstancedRingPart({ layout, position, rotation, children }: InstancedRingPartProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { count, radius, y, angleOffset, faceOutward } = layout;
  const [px, py, pz] = position ?? [0, 0, 0];
  const [rx, ry, rz] = rotation ?? [0, 0, 0];

  const matrices = useMemo(
    () => ringInstanceMatrices(
      { count, radius, y, angleOffset, faceOutward },
      { position: [px, py, pz], rotation: [rx, ry, rz] }
    ),
    [count, radius, y, angleOffset, faceOutward, px, py, pz, rx, ry, rz]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, matrices.length]}>
      {children}
    </instancedMesh>
  );
}
