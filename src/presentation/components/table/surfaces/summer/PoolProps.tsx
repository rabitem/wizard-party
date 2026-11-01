'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useDisposables } from '@/presentation/components/three/themed-environments/primitives/useDisposables';
import { SURFACE_LAYOUT, SURFACE_RIM_SLOTS_DEG } from '../surface.config';
import { rimFrame } from '../surface-geometry';

export interface PoolPropMaterials {
  chrome: THREE.Material;
  paddleWood: THREE.Material;
  paddleGrip: THREE.Material;
  swimRing: THREE.Material;
}

const DECK_Y = SURFACE_LAYOUT.RIM_OVERLAY_Y;
const LADDER = { RADIUS: 2.88, RAIL_X: 0.09, TUBE: 0.0085 } as const;
/** Pitch leans the handle onto the armrest top (r ~3.45, y ~0.22); LIFT keeps the blade tip on the deck. */
const PADDLE = { HANDLE: 0.42, PITCH: -0.42, YAW: 0.32, RADIUS: 3.04, LIFT: 0.05 } as const;
const SWIM_RING = { RADIUS: 3.15, MAJOR: 0.13, MINOR: 0.05, TILT: 0.16 } as const;

/** Ladder rail in its local frame (+z outward): foot on the deck, arc over the coping, down into the water. */
const RAIL_PATH: ReadonlyArray<readonly [number, number]> = [
  [0.2, DECK_Y],
  [0.195, 0.14],
  [0.16, 0.235],
  [0.08, 0.262],
  [0.0, 0.235],
  [-0.03, 0.16],
  [-0.04, 0.06],
  [-0.042, 0.0],
];

function createPropGeometries() {
  const rail = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(RAIL_PATH.map(([z, y]) => new THREE.Vector3(0, y, z))),
    40,
    LADDER.TUBE,
    6,
  );
  const handle = new THREE.CylinderGeometry(0.011, 0.011, PADDLE.HANDLE, 8);
  handle.rotateX(Math.PI / 2);
  handle.translate(0, 0, 0.08 + PADDLE.HANDLE / 2);
  const grip = new THREE.CylinderGeometry(0.014, 0.014, 0.07, 8);
  grip.rotateZ(Math.PI / 2);
  grip.translate(0, 0, 0.08 + PADDLE.HANDLE);
  const blade = new THREE.CylinderGeometry(0.06, 0.06, 0.012, 18);
  blade.scale(1, 1, 1.45);
  return {
    rail,
    flange: new THREE.CylinderGeometry(0.02, 0.022, 0.006, 12),
    handle,
    grip,
    blade,
    swimRing: new THREE.TorusGeometry(SWIM_RING.MAJOR, SWIM_RING.MINOR, 10, 28),
  };
}

type PropGeometries = ReturnType<typeof createPropGeometries>;

function PoolLadder({ geometries, chrome }: { geometries: PropGeometries; chrome: THREE.Material }) {
  const frame = rimFrame(SURFACE_RIM_SLOTS_DEG.EAST, LADDER.RADIUS);
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      {[-LADDER.RAIL_X, LADDER.RAIL_X].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={geometries.rail} material={chrome} />
          <mesh geometry={geometries.flange} material={chrome} position={[0, DECK_Y + 0.003, 0.2]} />
        </group>
      ))}
    </group>
  );
}

/** Two wooden paddles crossed and leaning on the armrest, blades resting on the deck. */
function CrossedPaddles({ geometries, materials }: { geometries: PropGeometries; materials: PoolPropMaterials }) {
  const frame = rimFrame(SURFACE_RIM_SLOTS_DEG.NORTH_WEST, PADDLE.RADIUS, DECK_Y + PADDLE.LIFT);
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.07, side * 0.004, 0]} rotation={[0, -side * PADDLE.YAW, 0]}>
          <group rotation={[PADDLE.PITCH + side * 0.03, 0, side * 0.12]}>
            <mesh geometry={geometries.blade} material={materials.paddleWood} />
            <mesh geometry={geometries.handle} material={materials.paddleWood} />
            <mesh geometry={geometries.grip} material={materials.paddleGrip} />
          </group>
        </group>
      ))}
    </group>
  );
}

function SwimRing({ geometries, material }: { geometries: PropGeometries; material: THREE.Material }) {
  const frame = rimFrame(SURFACE_RIM_SLOTS_DEG.WEST, SWIM_RING.RADIUS, DECK_Y + SWIM_RING.MINOR);
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      <mesh geometry={geometries.swimRing} material={material} rotation={[-Math.PI / 2 - SWIM_RING.TILT, 0, 0.4]} />
    </group>
  );
}

/** Static poolside props: chrome ladder, crossed paddles and an inflatable swim ring (all on the rim). */
export function PoolProps({ materials }: { materials: PoolPropMaterials }) {
  const geometries = useMemo(() => createPropGeometries(), []);
  useDisposables(geometries);
  return (
    <group>
      <PoolLadder geometries={geometries} chrome={materials.chrome} />
      <CrossedPaddles geometries={geometries} materials={materials} />
      <SwimRing geometries={geometries} material={materials.swimRing} />
    </group>
  );
}
