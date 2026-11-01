'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SOLARPUNK_BUTTERFLIES } from '@/presentation/config/solarpunk-environment.config';
import { seededRandom, useDisposables, usePrefersReducedMotion } from '../primitives';
import { createWingGeometry } from './solarpunk-geometry';

const B = SOLARPUNK_BUTTERFLIES;
const FLAP = { SPEED: 13, AMPLITUDE: 0.9, REST: 0.4 } as const;
const PATH = { SPEED: 0.32, BOB: 0.3, BOB_SPEED: 1.5 } as const;
const WINGS = 2;
const HEADING_STEP = 0.05;

interface Butterfly {
  home: THREE.Vector3;
  phase: number;
  speed: number;
  fx: number;
  fz: number;
  scale: number;
}

/**
 * Butterflies looping lazily between the potted plants, wings flapping.
 * Both wings of every butterfly live in one instanced mesh; with reduced
 * motion they rest with wings half open.
 */
export function GreenhouseButterflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const assets = useMemo(
    () => ({
      wing: createWingGeometry(),
      material: new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.6, emissive: '#3a3010', emissiveIntensity: 0.35 }),
    }),
    [],
  );
  useDisposables(assets);

  const butterflies = useMemo<Butterfly[]>(() => {
    const rand = seededRandom(149);
    return Array.from({ length: B.COUNT }, (_, i) => ({
      home: new THREE.Vector3(...B.HOMES[i % B.HOMES.length]),
      phase: rand() * Math.PI * 2,
      speed: PATH.SPEED * (0.7 + rand() * 0.6),
      fx: 1 + Math.floor(rand() * 2),
      fz: 2 + Math.floor(rand() * 2),
      scale: 0.9 + rand() * 0.5,
    }));
  }, []);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), position: new THREE.Vector3(), ahead: new THREE.Vector3() }), []);

  const pathPoint = (b: Butterfly, t: number, target: THREE.Vector3) =>
    target.set(
      b.home.x + Math.sin(t * b.fx + b.phase) * B.ROAM,
      b.home.y + Math.sin(t * PATH.BOB_SPEED + b.phase) * PATH.BOB,
      b.home.z + Math.sin(t * b.fz + b.phase * 1.3) * B.ROAM * 0.7,
    );

  const update = (time: number, animate: boolean) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { object, position, ahead } = scratch;
    butterflies.forEach((b, i) => {
      const t = time * b.speed;
      pathPoint(b, t, position);
      pathPoint(b, t + HEADING_STEP, ahead);
      const heading = Math.atan2(ahead.x - position.x, ahead.z - position.z);
      const flap = animate ? FLAP.REST + Math.sin(time * FLAP.SPEED + b.phase) * FLAP.AMPLITUDE : FLAP.REST;
      for (let side = 0; side < WINGS; side++) {
        const sign = side === 0 ? 1 : -1;
        object.position.copy(position);
        object.rotation.set(0, heading, sign * flap, 'YXZ');
        object.scale.set(sign * b.scale, b.scale, b.scale);
        object.updateMatrix();
        mesh.setMatrixAt(i * WINGS + side, object.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    butterflies.forEach((_, i) => {
      color.set(B.COLORS[i % B.COLORS.length]);
      for (let side = 0; side < WINGS; side++) mesh.setColorAt(i * WINGS + side, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    update(0, false);
    // update only reads refs and memoised butterfly data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [butterflies]);

  useFrame(({ clock }) => {
    if (!reducedMotion) update(clock.getElapsedTime(), true);
  });

  if (butterflies.length === 0) return null;
  return <instancedMesh ref={ref} args={[assets.wing, assets.material, butterflies.length * WINGS]} frustumCulled={false} />;
}
