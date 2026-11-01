import * as THREE from 'three';
import { RapierRigidBody } from '@react-three/rapier';
import {
  REST_DETECTION,
  COLLISION_RESPONSE,
} from '../../config/rapier.config';
import { CardCollisionData, CollisionPayload } from './types';

/**
 * Calculate the speed (magnitude) of a velocity vector
 */
export function calculateSpeed(vel: { x: number; y: number; z: number }): number {
  return Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
}

/**
 * Check if linear and angular velocities are below rest thresholds
 */
export function isVelocityAtRest(
  linearVel: { x: number; y: number; z: number },
  angularVel: { x: number; y: number; z: number },
  useWakeThreshold: boolean = false
): boolean {
  const speed = calculateSpeed(linearVel);
  const angSpeed = calculateSpeed(angularVel);

  if (useWakeThreshold) {
    return (
      speed < REST_DETECTION.WAKE_LINEAR_THRESHOLD &&
      angSpeed < REST_DETECTION.WAKE_ANGULAR_THRESHOLD
    );
  }

  return (
    speed < REST_DETECTION.LINEAR_VELOCITY_THRESHOLD &&
    angSpeed < REST_DETECTION.ANGULAR_VELOCITY_THRESHOLD
  );
}

/**
 * Determine the type of collider from collision payload
 */
export function determineColliderType(
  payload: CollisionPayload
): { colliderType: 'table' | 'card' | 'other'; otherCardId?: string } {
  const otherUserData = payload.other.rigidBodyObject?.userData;
  const otherCardId = otherUserData?.cardId as string | undefined;

  if (otherCardId) {
    return { colliderType: 'card', otherCardId };
  }

  if (payload.other.rigidBody && !payload.other.rigidBody.isDynamic?.()) {
    return { colliderType: 'table' };
  }

  return { colliderType: 'other' };
}

/**
 * Extract collision data from a collision event
 */
export function extractCollisionData(
  rigidBody: RapierRigidBody,
  payload: CollisionPayload
): CardCollisionData | null {
  const pos = rigidBody.translation();
  const vel = rigidBody.linvel();
  const speed = calculateSpeed(vel);

  // Skip minor collisions
  if (speed < COLLISION_RESPONSE.MIN_IMPACT_VELOCITY) {
    return null;
  }

  // Clamp impact velocity
  const clampedSpeed = Math.min(speed, COLLISION_RESPONSE.MAX_IMPACT_VELOCITY);

  // Get collision type
  const { colliderType, otherCardId } = determineColliderType(payload);

  // Get collision normal (direction of impact)
  const normalData = payload.manifold.localNormal1();
  const normal = new THREE.Vector3(normalData.x, normalData.y, normalData.z).normalize();

  return {
    impactVelocity: clampedSpeed,
    position: new THREE.Vector3(pos.x, pos.y, pos.z),
    normal,
    colliderType,
    otherCardId,
  };
}

/**
 * Apply collision response for card-to-card impacts
 */
export function applyCardCollisionResponse(
  rigidBody: RapierRigidBody,
  collisionData: CardCollisionData
): void {
  if (collisionData.colliderType !== 'card' || !rigidBody.isDynamic()) {
    return;
  }

  // Apply slight lift to prevent overlap
  const liftImpulse = COLLISION_RESPONSE.COLLISION_LIFT_FACTOR * collisionData.impactVelocity;
  rigidBody.applyImpulse({ x: 0, y: liftImpulse, z: 0 }, true);

  // Apply spin from collision normal for realistic response
  const spinImpulse = COLLISION_RESPONSE.COLLISION_SPIN_FACTOR * collisionData.impactVelocity;
  rigidBody.applyTorqueImpulse(
    {
      x: collisionData.normal.z * spinImpulse,
      y: 0,
      z: -collisionData.normal.x * spinImpulse,
    },
    true
  );
}

/**
 * Check if position is below the fallen threshold (card fell off table)
 */
export function hasCardFallen(posY: number): boolean {
  return posY < REST_DETECTION.FALLEN_Y_THRESHOLD;
}

/**
 * Zero out velocities on a rigid body for sleep state
 */
export function zeroVelocities(rigidBody: RapierRigidBody): void {
  rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/**
 * Apply impulse and optional torque to a rigid body
 */
export function applyImpulseToRigidBody(
  rigidBody: RapierRigidBody,
  impulse: THREE.Vector3,
  torque?: THREE.Vector3
): void {
  rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
  if (torque) {
    rigidBody.applyTorqueImpulse({ x: torque.x, y: torque.y, z: torque.z }, true);
  }
}

/**
 * Get position as THREE.Vector3 from rigid body
 */
export function getPositionVector(rigidBody: RapierRigidBody): THREE.Vector3 {
  const pos = rigidBody.translation();
  return new THREE.Vector3(pos.x, pos.y, pos.z);
}

/**
 * Get velocity as THREE.Vector3 from rigid body
 */
export function getVelocityVector(rigidBody: RapierRigidBody): THREE.Vector3 {
  const vel = rigidBody.linvel();
  return new THREE.Vector3(vel.x, vel.y, vel.z);
}

/**
 * Set linear velocity on rigid body from tuple
 */
export function setLinearVelocity(
  rigidBody: RapierRigidBody,
  velocity: [number, number, number]
): void {
  rigidBody.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
}

/**
 * Set angular velocity on rigid body from tuple
 */
export function setAngularVelocity(
  rigidBody: RapierRigidBody,
  velocity: [number, number, number]
): void {
  rigidBody.setAngvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
}
