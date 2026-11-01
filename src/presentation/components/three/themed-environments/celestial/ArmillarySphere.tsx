'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_COLORS, CELESTIAL_LAYOUT, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { addSurfaceDetail, MatrixInstances, localMatrix, useDisposables, usePrefersReducedMotion } from '../primitives';
import { createBrassMaterial } from './celestial-materials';

const A = CELESTIAL_LAYOUT.ARMILLARY;
const RING_TUBE = 0.035;

/** Fixed frame: horizon ring and meridian ring. */
const FRAME_RINGS = [
  localMatrix([0, 0, 0], [Math.PI / 2, 0, 0], [1.08, 1.08, 1.08]),
  localMatrix([0, 0, 0], [0, 0, 0], [1.02, 1.02, 1.02]),
];
/** Rotating cage: equator, two colures and the tilted ecliptic band. */
const CAGE_RINGS = [
  localMatrix([0, 0, 0], [Math.PI / 2, 0, 0]),
  localMatrix([0, 0, 0], [0, Math.PI / 2, 0], [0.96, 0.96, 0.96]),
  localMatrix([0, 0, 0], [0, Math.PI / 4, 0], [0.96, 0.96, 0.96]),
  localMatrix([0, 0, 0], [Math.PI / 2 + A.tilt, 0, 0], [0.92, 0.92, 2.2]),
];

/**
 * Brass armillary sphere on a turned pedestal: a fixed horizon/meridian frame
 * around a slowly turning cage of celestial circles with a glowing sun at the
 * centre. Rings share one torus geometry (two instanced draws).
 */
export function ArmillarySphere() {
  const cage = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(
    () => ({
      brass: createBrassMaterial({ emissiveIntensity: 0.25, roughness: 0.3 }),
      stone: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: CELESTIAL_COLORS.stoneDark, roughness: 0.6 }), { scale: 3 }),
      sun: new THREE.MeshBasicMaterial({
        color: new THREE.Color(CELESTIAL_COLORS.sun).multiplyScalar(CELESTIAL_REALISM.SUN_BRIGHTNESS),
        toneMapped: false,
      }),
      ring: new THREE.TorusGeometry(A.radius, RING_TUBE, 5, 48),
      pedestal: new THREE.CylinderGeometry(0.18, 0.4, A.pedestalHeight, 12),
      plinth: new THREE.CylinderGeometry(0.55, 0.6, 0.18, 16),
      cradle: new THREE.CylinderGeometry(0.3, 0.12, 0.25, 12),
      axis: new THREE.CylinderGeometry(0.02, 0.02, A.radius * 2.5, 6),
      sunBall: new THREE.SphereGeometry(0.16, 16, 12),
    }),
    [],
  );
  useDisposables(assets);

  useFrame((_, delta) => {
    if (!reducedMotion && cage.current) cage.current.rotation.y += delta * A.spinSpeed;
  });

  const centerY = A.pedestalHeight + A.radius + 0.15;
  return (
    <group position={A.position}>
      <mesh geometry={assets.plinth} material={assets.stone} position={[0, 0.09, 0]} />
      <mesh geometry={assets.pedestal} material={assets.stone} position={[0, A.pedestalHeight / 2 + 0.18, 0]} />
      <mesh geometry={assets.cradle} material={assets.brass} position={[0, A.pedestalHeight + 0.3, 0]} />

      <group position={[0, centerY, 0]} rotation={[0, 0, A.tilt]}>
        <MatrixInstances geometry={assets.ring} material={assets.brass} matrices={FRAME_RINGS} />
        <mesh geometry={assets.axis} material={assets.brass} />
        <group ref={cage}>
          <MatrixInstances geometry={assets.ring} material={assets.brass} matrices={CAGE_RINGS} />
        </group>
        <mesh geometry={assets.sunBall} material={assets.sun} />
      </group>
    </group>
  );
}
