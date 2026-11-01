'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SPRING_BUTTERFLY_COLORS, SPRING_LAYOUT } from '@/presentation/config/spring-environment.config';
import { seededRandom, useDisposables, usePrefersReducedMotion } from '../primitives';
import { createWingGeometry } from './spring-geometry';

const FLAP = { SPEED: 14, AMPLITUDE: 0.95, REST: 0.35 } as const;
const PATH = { SPEED: 0.35, BOB: 0.25, BOB_SPEED: 1.7 } as const;
const WINGS_PER_BUTTERFLY = 2;
/** Look-ahead used to derive the heading from the path */
const HEADING_STEP = 0.05;

interface Butterfly {
  home: THREE.Vector3;
  phase: number;
  speed: number;
  /** Lissajous ratios so every butterfly traces a different loop */
  fx: number;
  fz: number;
  scale: number;
}

/**
 * Butterflies wandering in loops around the flower beds and trees, wings
 * flapping. One instanced mesh holds both wings of every butterfly; with
 * reduced motion they rest with wings half open.
 */
export function Butterflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const assets = useMemo(
    () => ({
      wing: createWingGeometry(),
      material: new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.6, emissive: '#2a1a10', emissiveIntensity: 0.4 }),
    }),
    [],
  );
  useDisposables(assets);

  const butterflies = useMemo<Butterfly[]>(() => {
    const rand = seededRandom(131);
    const homes = SPRING_LAYOUT.BUTTERFLY_HOMES;
    return Array.from({ length: SPRING_LAYOUT.BUTTERFLY_COUNT }, (_, i) => ({
      home: new THREE.Vector3(...homes[i % homes.length]),
      phase: rand() * Math.PI * 2,
      speed: PATH.SPEED * (0.7 + rand() * 0.6),
      fx: 1 + Math.floor(rand() * 2),
      fz: 2 + Math.floor(rand() * 2),
      scale: 0.9 + rand() * 0.5,
    }));
  }, []);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), position: new THREE.Vector3(), ahead: new THREE.Vector3() }), []);

  const pathPoint = (b: Butterfly, t: number, target: THREE.Vector3) => {
    const roam = SPRING_LAYOUT.BUTTERFLY_ROAM;
    return target.set(
      b.home.x + Math.sin(t * b.fx + b.phase) * roam,
      b.home.y + Math.sin(t * PATH.BOB_SPEED + b.phase) * PATH.BOB,
      b.home.z + Math.sin(t * b.fz + b.phase * 1.3) * roam * 0.7,
    );
  };

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
      for (let side = 0; side < WINGS_PER_BUTTERFLY; side++) {
        const sign = side === 0 ? 1 : -1;
        object.position.copy(position);
        // Yaw to the heading, then fold the wing up around the body (local z).
        object.rotation.set(0, heading, sign * flap, 'YXZ');
        object.scale.set(sign * b.scale, b.scale, b.scale);
        object.updateMatrix();
        mesh.setMatrixAt(i * WINGS_PER_BUTTERFLY + side, object.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    butterflies.forEach((_, i) => {
      color.set(SPRING_BUTTERFLY_COLORS[i % SPRING_BUTTERFLY_COLORS.length]);
      for (let side = 0; side < WINGS_PER_BUTTERFLY; side++) mesh.setColorAt(i * WINGS_PER_BUTTERFLY + side, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    update(0, false);
    // update only reads refs and memoised butterfly data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [butterflies]);

  useFrame(({ clock }) => {
    if (!reducedMotion) update(clock.getElapsedTime(), true);
  });

  const count = butterflies.length * WINGS_PER_BUTTERFLY;
  if (count === 0) return null;
  return <instancedMesh ref={ref} args={[assets.wing, assets.material, count]} frustumCulled={false} />;
}
