'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { getVoxelGeometry } from './voxel-models';

interface SpinningCoinsProps {
  positions: readonly Vec3[];
  /** Voxel edge length */
  scale: number;
  /** Radians per second */
  spinSpeed: number;
  /** Bob height in world units */
  bob: number;
}

const scratch = new THREE.Object3D();

/**
 * Voxel coins spinning and bobbing in place: one instanced mesh, matrices
 * rewritten each frame (a handful of instances). Frozen for reduced motion.
 */
export function SpinningCoins({ positions, scale, spinSpeed, bob }: SpinningCoinsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const geometry = getVoxelGeometry('coin', 'center');
  const materials = useMemo(
    () => ({
      coin: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.2,
        emissive: '#ffb02e',
        emissiveIntensity: 0.25,
      }),
    }),
    [],
  );
  useDisposables(materials);

  const update = (time: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    positions.forEach(([x, y, z], i) => {
      const phase = i * 0.9;
      scratch.position.set(x, y + Math.sin(time * 2 + phase) * bob, z);
      scratch.rotation.set(0, time * spinSpeed + phase, 0);
      scratch.scale.setScalar(scale);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    update(0);
    ref.current?.computeBoundingSphere();
    // update only reads props and the mesh ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, scale]);

  useFrame(({ clock }) => {
    if (!reducedMotion) update(clock.getElapsedTime());
  });

  if (positions.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, materials.coin, positions.length]} frustumCulled={false} />;
}
