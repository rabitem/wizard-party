'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WINTER_COLORS, WINTER_LAYOUT } from '@/presentation/config/winter-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, createPbrMaterial, InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { applySnowDusting } from './snow-dusting';

/** Body spheres from the ground up: [radius, centre y]. */
const BODY: ReadonlyArray<[number, number]> = [
  [0.62, 0.55],
  [0.46, 1.4],
  [0.33, 2.06],
];
const HEAD_Y = BODY[2][1];
const HEAD_R = BODY[2][0];
const COAL_SIZE = 0.045;
const DRIFT = { RADIUS: 1.2, HEIGHT: 0.18 } as const;
/** Packed snow everywhere (threshold -1) with view-dependent glints that bloom slightly. */
const SPARKLY_SNOW = { amount: 1, threshold: -1, sparkle: 0.9, keepSurface: 1 } as const;

/** Coal eyes, smile and buttons placed on the sphere surfaces (+z is the front). */
function onSphere(radius: number, centerY: number, angleX: number, angleY: number): Vec3 {
  return [Math.sin(angleX) * radius * Math.cos(angleY), centerY + Math.sin(angleY) * radius, Math.cos(angleX) * radius * Math.cos(angleY)];
}
const COALS: PropPlacement[] = [
  { position: onSphere(HEAD_R, HEAD_Y, -0.32, 0.25) },
  { position: onSphere(HEAD_R, HEAD_Y, 0.32, 0.25) },
  ...[-0.5, -0.25, 0, 0.25, 0.5].map((a) => ({ position: onSphere(HEAD_R, HEAD_Y, a, -0.35 + Math.abs(a) * 0.3), scale: 0.7 })),
  ...[0.35, 0, -0.35].map((a) => ({ position: onSphere(BODY[1][0], BODY[1][1], 0, a), scale: 1.3 })),
];

/** Twig arms: [side] with a forked tip. */
const ARMS = [-1, 1].map((side) => ({
  id: `arm-${side}`,
  position: [side * (BODY[1][0] + 0.32), BODY[1][1] + 0.18, 0] as Vec3,
  rotation: [0, 0, side * -1.05] as Vec3,
}));

/**
 * Snowman on a little drift by the windows: three sparkly packed-snow balls, coal face and
 * buttons, carrot nose, scarf, twig arms and a top hat.
 */
export function Snowman() {
  const assets = useMemo(
    () => ({
      snow: applySnowDusting(
        createPbrMaterial('snow', { color: WINTER_COLORS.snowman, accent: WINTER_COLORS.snowShadow, repeat: [2, 1], normalScale: 0.8 }),
        SPARKLY_SNOW,
      ),
      coal: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.coal, roughness: 0.6 }), { scale: 8, normalStrength: 0.8 }),
      carrot: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.carrot, roughness: 0.7 }),
      scarf: createPbrMaterial('fabric', { color: WINTER_COLORS.scarf, repeat: [2, 2], seed: 9 }),
      hat: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.hat, roughness: 0.6 }),
      twig: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.twig, roughness: 0.9 }),
      coalGeometry: new THREE.IcosahedronGeometry(COAL_SIZE, 0),
      ball: new THREE.SphereGeometry(1, 14, 10),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group position={WINTER_LAYOUT.SNOWMAN_POSITION} rotation={[0, WINTER_LAYOUT.SNOWMAN_ROTATION, 0]}>
      <mesh position={[0, 0, 0]} scale={[DRIFT.RADIUS, DRIFT.HEIGHT, DRIFT.RADIUS]} geometry={assets.ball} material={assets.snow} />
      {BODY.map(([radius, y]) => (
        <mesh key={`ball-${y}`} position={[0, y, 0]} scale={radius} geometry={assets.ball} material={assets.snow} />
      ))}
      <InstancedProp geometry={assets.coalGeometry} material={assets.coal} placements={COALS} />
      <mesh position={[0, HEAD_Y, HEAD_R + 0.12]} rotation={[Math.PI / 2, 0, 0]} material={assets.carrot}>
        <coneGeometry args={[0.055, 0.32, 7]} />
      </mesh>
      <mesh position={[0, HEAD_Y - HEAD_R * 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} material={assets.scarf}>
        <torusGeometry args={[HEAD_R * 0.82, 0.075, 6, 16]} />
      </mesh>
      <mesh position={[0.18, HEAD_Y - HEAD_R - 0.2, HEAD_R * 0.7]} rotation={[0.25, 0, 0.12]} material={assets.scarf}>
        <boxGeometry args={[0.14, 0.42, 0.05]} />
      </mesh>
      <group position={[0, HEAD_Y + HEAD_R * 0.82, 0]} rotation={[0, 0, 0.12]}>
        <mesh material={assets.hat}>
          <cylinderGeometry args={[0.36, 0.36, 0.04, 14]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={assets.hat}>
          <cylinderGeometry args={[0.22, 0.24, 0.4, 14]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={assets.scarf}>
          <cylinderGeometry args={[0.245, 0.245, 0.07, 14]} />
        </mesh>
      </group>
      {ARMS.map((arm) => (
        <group key={arm.id} position={arm.position} rotation={arm.rotation}>
          <mesh material={assets.twig}>
            <cylinderGeometry args={[0.018, 0.028, 0.75, 5]} />
          </mesh>
          <mesh position={[0.06, 0.3, 0]} rotation={[0, 0, -0.6]} material={assets.twig}>
            <cylinderGeometry args={[0.01, 0.015, 0.22, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
