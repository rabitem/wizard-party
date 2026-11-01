'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { CylinderCollider, InstancedRigidBodies } from '@react-three/rapier';
import * as THREE from 'three';
import { COLLISION_GROUPS, interactionGroups } from '../../config/rapier.config';
import { CHIP_PLACEMENTS, COASTER_PLACEMENTS, DECORATION_SHAPES, type DecorationPlacement } from './decoration-layout';
import { writePlacementMatrices } from './decoration-instances';

// Decorations collide with cards, the table and each other
const DECORATION_COLLISION_GROUPS = interactionGroups(
  COLLISION_GROUPS.DECORATION,
  COLLISION_GROUPS.CARD | COLLISION_GROUPS.TABLE | COLLISION_GROUPS.DECORATION,
);

const CHIP_BODY = { mass: 0.01, linearDamping: 1.5, angularDamping: 2.0, restitution: 0.2, friction: 0.6 } as const;
const COASTER_BODY = { mass: 0.02, linearDamping: 2.0, angularDamping: 3.0, restitution: 0.1, friction: 0.8 } as const;
const { RADIUS: CHIP_RADIUS, HEIGHT: CHIP_HEIGHT } = DECORATION_SHAPES.CHIP;
const { RADIUS: COASTER_RADIUS, HEIGHT: COASTER_HEIGHT } = DECORATION_SHAPES.COASTER;

const chipInstances = CHIP_PLACEMENTS.map(({ key, position, rotation }) => ({ key, position, rotation }));
const coasterInstances = COASTER_PLACEMENTS.map(({ key, position, rotation }) => ({ key, position, rotation }));
// Each body uses exactly its explicit collider (colliders={false} below): the automatic cuboid
// from the instanced mesh would add a second, box-shaped collider around every round body
const chipColliders = [<CylinderCollider key="chip" args={[CHIP_HEIGHT / 2, CHIP_RADIUS]} />];
const coasterColliders = [<CylinderCollider key="coaster" args={[COASTER_HEIGHT / 2, COASTER_RADIUS]} />];

/** Chip edge ring and centre inlay, with their offsets baked in so they share the body's matrices. */
function useChipDetailGeometries() {
  const geometries = useMemo(() => ({
    ring: new THREE.TorusGeometry(0.075, 0.005, 8, 24).rotateX(Math.PI / 2),
    inlay: new THREE.CircleGeometry(0.04, 16).rotateX(-Math.PI / 2).translate(0, 0.011, 0),
  }), []);
  useEffect(() => () => {
    geometries.ring.dispose();
    geometries.inlay.dispose();
  }, [geometries]);
  return geometries;
}

/** Initial poses (Rapier only writes a body's matrix once it moves) and, for chips, colours. */
function useInitialInstances(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  placements: readonly DecorationPlacement[],
  colors?: readonly string[],
) {
  useLayoutEffect(() => {
    const target = meshRef.current;
    if (!target) return;
    writePlacementMatrices(placements, target.instanceMatrix);
    colors?.forEach((color, i) => target.setColorAt(i, new THREE.Color(color)));
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
  }, [meshRef, placements, colors]);
}

const CHIP_COLORS = CHIP_PLACEMENTS.map((chip) => chip.color);

/**
 * Every poker chip on the table: one rigid body per chip, three instanced draws in total (body,
 * edge ring, inlay; only the body casts a shadow). The ring and inlay share the body mesh's
 * instance matrix buffer, so whatever Rapier writes for a knocked chip moves all three parts.
 */
export function PhysicsChipStacks() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const inlayRef = useRef<THREE.InstancedMesh>(null);
  const { ring, inlay } = useChipDetailGeometries();
  const count = CHIP_PLACEMENTS.length;
  useInitialInstances(bodyRef, CHIP_PLACEMENTS, CHIP_COLORS);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    for (const part of [ringRef.current, inlayRef.current]) {
      if (part) part.instanceMatrix = body.instanceMatrix;
    }
  }, []);

  return (
    <group>
      <InstancedRigidBodies
        instances={chipInstances}
        colliderNodes={chipColliders}
        colliders={false}
        collisionGroups={DECORATION_COLLISION_GROUPS}
        {...CHIP_BODY}
      >
        <instancedMesh ref={bodyRef} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
          <cylinderGeometry args={[CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
        </instancedMesh>
      </InstancedRigidBodies>
      <instancedMesh ref={ringRef} args={[ring, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={inlayRef} args={[inlay, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.0} />
      </instancedMesh>
    </group>
  );
}

/** Coasters resting on the table (one instanced draw; they sleep once settled). */
export function PhysicsCoasters() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useInitialInstances(meshRef, COASTER_PLACEMENTS);

  return (
    <InstancedRigidBodies
      instances={coasterInstances}
      colliderNodes={coasterColliders}
      colliders={false}
      collisionGroups={DECORATION_COLLISION_GROUPS}
      {...COASTER_BODY}
    >
      <instancedMesh ref={meshRef} args={[undefined, undefined, COASTER_PLACEMENTS.length]} receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[COASTER_RADIUS, COASTER_RADIUS, COASTER_HEIGHT, 24]} />
        <meshStandardMaterial color="#2a1810" roughness={0.85} metalness={0.0} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}
