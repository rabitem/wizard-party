import type { PhysicsCard3DProps } from './types';

type RigidBodyType = NonNullable<PhysicsCard3DProps['type']>;
type Vec3 = [number, number, number];

/** Key for bodies that physics moves: they are never re-created by a prop change */
export const SIMULATED_BODY_KEY = 'simulated';

/**
 * React key for a card's RigidBody.
 *
 * @react-three/rapier freezes the parent's inverse world matrix when a body is
 * created, and re-syncs later pose props from a passive effect. That effect
 * can lose the race with the physics step (which writes the old body pose back
 * onto the object first, so the new layout is reverted), and it snapshots the
 * parent's current world matrix (tilted while the table shakes, so the pose
 * drifts against the frozen inverse). A fixed body is pure layout, so it is
 * re-created whenever its pose changes instead, which captures the body pose
 * and the parent inverse from the same parent matrix every time.
 */
export function getRigidBodyPoseKey(
  type: RigidBodyType,
  position: Vec3,
  rotation: Vec3
): string {
  if (type !== 'fixed') return SIMULATED_BODY_KEY;
  return `fixed:${position.join(',')}:${rotation.join(',')}`;
}
