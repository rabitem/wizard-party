'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TRUMP_BURN_MARKS, TRUMP_EMBERS } from '@/presentation/config/trump-indicator.config';

/** Identical overlapping smoke marks share one draw while retaining their individual pulses. */
export function SmokeBrand() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pose = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    TRUMP_BURN_MARKS.forEach((mark, i) => {
      const pulse = 1 + Math.sin(time * 2 + i * 0.5) * 0.1;
      pose.position.set(mark.x, mark.z, 0.001);
      pose.rotation.set(0, 0, mark.rotation);
      pose.scale.set(mark.scale * pulse, mark.scale * pulse, 1);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TRUMP_BURN_MARKS.length]} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial color="#1a0a00" transparent opacity={0.6} depthWrite={false} />
    </instancedMesh>
  );
}

/** Shared sphere geometry, with the original independent ember orbits. */
export function EmberParticles({ color }: { color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pose = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    for (let i = 0; i < TRUMP_EMBERS.COUNT; i++) {
      const angle = time * 0.4 + (i / TRUMP_EMBERS.COUNT) * Math.PI * 2;
      const radius = 0.25 + Math.sin(time * 0.5 + i) * 0.08;
      const height = 0.08 + Math.sin(time * 2 + i * 0.7) * 0.04;
      pose.makeTranslation(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      mesh.setMatrixAt(i, pose);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TRUMP_EMBERS.COUNT]} frustumCulled={false}>
      <sphereGeometry args={[TRUMP_EMBERS.RADIUS, TRUMP_EMBERS.WIDTH_SEGMENTS, TRUMP_EMBERS.HEIGHT_SEGMENTS]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </instancedMesh>
  );
}
