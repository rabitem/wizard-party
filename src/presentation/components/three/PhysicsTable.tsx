'use client';

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import {
  TABLE_PHYSICS,
  interactionGroups,
} from '../../config/rapier.config';

/**
 * PhysicsTable - Static collider for the table surface
 * Cards will land and slide on this surface with realistic friction
 */
export function PhysicsTable() {
  return (
    <RigidBody
      type="fixed"
      position={[0, TABLE_PHYSICS.HEIGHT - TABLE_PHYSICS.THICKNESS / 2, 0]}
      collisionGroups={interactionGroups(
        TABLE_PHYSICS.COLLISION_MEMBERSHIP,
        TABLE_PHYSICS.COLLISION_FILTER
      )}
    >
      {/* Main table surface - circular approximated as large cuboid */}
      <CuboidCollider
        args={[TABLE_PHYSICS.RADIUS, TABLE_PHYSICS.THICKNESS / 2, TABLE_PHYSICS.RADIUS]}
        friction={TABLE_PHYSICS.FRICTION}
        restitution={TABLE_PHYSICS.RESTITUTION}
      />
    </RigidBody>
  );
}
