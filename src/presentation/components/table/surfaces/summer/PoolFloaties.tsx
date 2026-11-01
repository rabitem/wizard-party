'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDisposables } from '@/presentation/components/three/themed-environments/primitives/useDisposables';
import { usePrefersReducedMotion } from '@/presentation/components/three/themed-environments/primitives/usePrefersReducedMotion';
import { SURFACE_LAYOUT, SURFACE_MOTION, SURFACE_RIM_SLOTS_DEG } from '../surface.config';
import { rimFrame } from '../surface-geometry';

export interface FloatieMaterials {
  duckBody: THREE.Material;
  duckBeak: THREE.Material;
  duckEye: THREE.Material;
  mattress: THREE.Material;
}

/** Duck floats in the strip of water between the play radius (2.8) and the pool wall (2.86). */
const DUCK = { RADIUS: 2.83, SCALE: 0.9, FLOAT_Y: SURFACE_LAYOUT.FELT_Y + 0.004 } as const;
/**
 * Mattress lies radially: the inner half floats on the water and rises over the
 * coping, the outer half rests on the deck. Hinge sits just above the coping.
 */
const MATTRESS = {
  RADIUS: 2.88,
  WIDTH: 0.26,
  THICKNESS: 0.03,
  HINGE: [0.09, 0.07] as const,
  FLOAT_END: [-0.07, 0.035] as const,
  DECK_END: [0.34, 0.0] as const,
  BOB: 0.035,
} as const;

function createFloatieGeometries() {
  const [hz, hy] = MATTRESS.HINGE;
  const floatLength = Math.hypot(hz - MATTRESS.FLOAT_END[0], hy - MATTRESS.FLOAT_END[1]);
  const deckLength = Math.hypot(MATTRESS.DECK_END[0] - hz, hy - MATTRESS.DECK_END[1]);
  const floatPiece = new THREE.BoxGeometry(MATTRESS.WIDTH, MATTRESS.THICKNESS, floatLength);
  floatPiece.translate(0, 0, -floatLength / 2);
  const deckPiece = new THREE.BoxGeometry(MATTRESS.WIDTH, MATTRESS.THICKNESS, deckLength);
  deckPiece.translate(0, 0, deckLength / 2);
  const pillow = new THREE.BoxGeometry(MATTRESS.WIDTH * 0.92, 0.022, 0.07);
  pillow.translate(0, MATTRESS.THICKNESS * 0.6, deckLength - 0.05);
  const body = new THREE.SphereGeometry(1, 14, 10);
  body.scale(0.034, 0.026, 0.042);
  const head = new THREE.SphereGeometry(0.022, 12, 10);
  head.translate(0, 0.032, 0.022);
  const beak = new THREE.SphereGeometry(1, 10, 6);
  beak.scale(0.012, 0.005, 0.014);
  beak.translate(0, 0.028, 0.045);
  const tail = new THREE.ConeGeometry(0.014, 0.03, 8);
  tail.rotateX(-Math.PI / 2.6);
  tail.translate(0, 0.014, -0.042);
  return {
    floatPiece,
    deckPiece,
    pillow,
    body,
    head,
    beak,
    tail,
    eye: new THREE.SphereGeometry(0.0035, 6, 4),
    floatPitch: -Math.atan2(hy - MATTRESS.FLOAT_END[1], hz - MATTRESS.FLOAT_END[0]),
    deckPitch: Math.atan2(hy - MATTRESS.DECK_END[1], MATTRESS.DECK_END[0] - hz),
  };
}

type FloatieGeometries = ReturnType<typeof createFloatieGeometries>;

function RubberDuck({ geometries, materials }: { geometries: FloatieGeometries; materials: FloatieMaterials }) {
  const ref = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  const frame = rimFrame(SURFACE_RIM_SLOTS_DEG.NORTH_EAST, DUCK.RADIUS);

  useFrame(({ clock }) => {
    const duck = ref.current;
    if (!duck || reducedMotion) return;
    const t = clock.getElapsedTime() * SURFACE_MOTION.BOB_SPEED;
    duck.position.y = DUCK.FLOAT_Y + Math.sin(t) * SURFACE_MOTION.BOB_HEIGHT;
    duck.rotation.z = Math.sin(t * 0.8) * 0.08;
    duck.rotation.x = Math.sin(t + 1) * 0.05;
  });

  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      {/* Face along the rim (+x of the rim frame) */}
      <group ref={ref} position={[0, DUCK.FLOAT_Y, 0]} rotation={[0, Math.PI / 2, 0]} scale={DUCK.SCALE}>
        <mesh geometry={geometries.body} material={materials.duckBody} />
        <mesh geometry={geometries.head} material={materials.duckBody} />
        <mesh geometry={geometries.tail} material={materials.duckBody} />
        <mesh geometry={geometries.beak} material={materials.duckBeak} />
        <mesh geometry={geometries.eye} material={materials.duckEye} position={[0.009, 0.038, 0.037]} />
        <mesh geometry={geometries.eye} material={materials.duckEye} position={[-0.009, 0.038, 0.037]} />
      </group>
    </group>
  );
}

function AirMattress({ geometries, material }: { geometries: FloatieGeometries; material: THREE.Material }) {
  const floatRef = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  const frame = rimFrame(SURFACE_RIM_SLOTS_DEG.FRONT_LEFT, MATTRESS.RADIUS);

  useFrame(({ clock }) => {
    const piece = floatRef.current;
    if (!piece || reducedMotion) return;
    const t = clock.getElapsedTime() * SURFACE_MOTION.BOB_SPEED;
    piece.rotation.x = geometries.floatPitch + Math.sin(t * 0.9) * MATTRESS.BOB;
  });

  const [hz, hy] = MATTRESS.HINGE;
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      <group position={[0, hy, hz]}>
        <group ref={floatRef} rotation={[geometries.floatPitch, 0, 0]}>
          <mesh geometry={geometries.floatPiece} material={material} />
        </group>
        <group rotation={[geometries.deckPitch, 0, 0]}>
          <mesh geometry={geometries.deckPiece} material={material} />
          <mesh geometry={geometries.pillow} material={material} />
        </group>
      </group>
    </group>
  );
}

/** Floating props that bob gently (still when reduced motion is preferred): rubber duck + air mattress. */
export function PoolFloaties({ materials }: { materials: FloatieMaterials }) {
  const geometries = useMemo(() => createFloatieGeometries(), []);
  const disposables = useMemo(() => {
    const { floatPitch: _floatPitch, deckPitch: _deckPitch, ...meshes } = geometries;
    return meshes;
  }, [geometries]);
  useDisposables(disposables);
  return (
    <group>
      <RubberDuck geometries={geometries} materials={materials} />
      <AirMattress geometries={geometries} material={materials.mattress} />
    </group>
  );
}
