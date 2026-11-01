'use client';

import { useRef, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS } from '../../utils/card-texture';
import { getCardGeometry } from '../../utils/card-geometry';
import { useCardMaterials } from '../../hooks/useCardMaterials';
import { CARD_PHYSICS, interactionGroups } from '../../config/rapier.config';
import { CARD_STACKING } from '../../config/physics.config';
import { PhysicsCard3DHandle, PhysicsCard3DProps, CollisionPayload } from './types';
import {
  extractCollisionData,
  applyCardCollisionResponse,
  applyImpulseToRigidBody,
  getPositionVector,
  getVelocityVector,
  setLinearVelocity,
  setAngularVelocity,
  isVelocityAtRest,
} from './physics-utils';
import { useCardRestDetection } from './useCardRestDetection';
import { sceneObjectName } from './scene-object-names';
import { getRigidBodyPoseKey } from './rigid-body-pose-key';

const DEFAULT_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Shared empty default: RigidBody re-syncs its body from the (possibly shaking)
 * scene graph whenever userData changes identity, so it (and the merged
 * bodyUserData memo) must stay stable across re-renders.
 */
const NO_USER_DATA: Record<string, unknown> = {};

/** Create imperative handle methods for PhysicsCard3D */
function createHandleMethods(
  rigidBodyRef: React.RefObject<RapierRigidBody | null>,
  restDetection: { isSleeping: () => boolean; wakeUp: () => void; sleep: () => void }
): PhysicsCard3DHandle {
  return {
    getRigidBody: () => rigidBodyRef.current,

    applyImpulse: (impulse: THREE.Vector3, torque?: THREE.Vector3) => {
      if (rigidBodyRef.current) {
        if (restDetection.isSleeping()) restDetection.wakeUp();
        applyImpulseToRigidBody(rigidBodyRef.current, impulse, torque);
      }
    },

    getPosition: () => (rigidBodyRef.current ? getPositionVector(rigidBodyRef.current) : null),

    getVelocity: () => (rigidBodyRef.current ? getVelocityVector(rigidBodyRef.current) : null),

    isAtRest: () => {
      if (restDetection.isSleeping()) return true;
      if (rigidBodyRef.current) {
        return isVelocityAtRest(rigidBodyRef.current.linvel(), rigidBodyRef.current.angvel());
      }
      return false;
    },

    wakeUp: () => restDetection.wakeUp(),
    sleep: () => restDetection.sleep(),
  };
}

/**
 * PhysicsCard3D - A playing card with Rapier rigid body physics
 * Used for played cards on table, thrown cards, and collected cards
 */
export const PhysicsCard3D = forwardRef<PhysicsCard3DHandle, PhysicsCard3DProps>(
  (
    {
      card,
      initialPosition,
      initialRotation = DEFAULT_ROTATION,
      initialVelocity,
      initialAngularVelocity,
      scale = 0.9,
      type = 'dynamic',
      playOrder = 0,
      castShadow = true,
      onCollision,
      onRest,
      onWake,
      userData = NO_USER_DATA,
    },
    ref
  ) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    // Stable identity so re-renders do not re-snapshot the body (see NO_USER_DATA)
    const bodyUserData = useMemo(() => ({ cardId: card.id, ...userData }), [card.id, userData]);

    // Use the rest detection hook
    const restDetection = useCardRestDetection({ rigidBodyRef, onRest, onWake });

    // Expose handle methods
    useImperativeHandle(ref, () => createHandleMethods(rigidBodyRef, restDetection), [restDetection]);

    // Set up materials (disposed by the hook)
    const materials = useCardMaterials(card);

    // Apply initial velocity after mount
    useEffect(() => {
      if (rigidBodyRef.current && initialVelocity) {
        setLinearVelocity(rigidBodyRef.current, initialVelocity);
      }
      if (rigidBodyRef.current && initialAngularVelocity) {
        setAngularVelocity(rigidBodyRef.current, initialAngularVelocity);
      }
    }, [initialVelocity, initialAngularVelocity]);

    // Handle collision events with enhanced collision data
    const handleCollisionEnter = useCallback(
      (payload: CollisionPayload) => {
        if (!rigidBodyRef.current) return;

        const collisionData = extractCollisionData(rigidBodyRef.current, payload);
        if (!collisionData) return;

        // Wake up from sleep on collision
        restDetection.resetOnCollision();

        // Call enhanced collision callback
        if (onCollision) {
          onCollision(collisionData);
        }

        // Apply collision response for card-to-card impacts
        applyCardCollisionResponse(rigidBodyRef.current, collisionData);
      },
      [onCollision, restDetection]
    );

    return (
      <RigidBody
        // Fixed bodies are re-created on a layout change (see getRigidBodyPoseKey)
        key={getRigidBodyPoseKey(type, initialPosition, initialRotation)}
        ref={rigidBodyRef}
        type={type}
        position={initialPosition}
        rotation={initialRotation}
        linearDamping={CARD_PHYSICS.LINEAR_DAMPING}
        angularDamping={CARD_PHYSICS.ANGULAR_DAMPING}
        ccd={CARD_PHYSICS.CCD_ENABLED}
        collisionGroups={interactionGroups(
          CARD_PHYSICS.COLLISION_MEMBERSHIP,
          CARD_PHYSICS.COLLISION_FILTER
        )}
        userData={bodyUserData}
        onCollisionEnter={handleCollisionEnter}
      >
        {/* Collider dimensions must match visual mesh: [WIDTH, HEIGHT, THICKNESS] */}
        <CuboidCollider
          args={[
            (CARD_WIDTH * scale) / 2, // halfX = card width
            (CARD_HEIGHT * scale) / 2, // halfY = card height (was THICKNESS - wrong!)
            (CARD_THICKNESS * scale) / 2, // halfZ = card thickness (was HEIGHT - wrong!)
          ]}
          friction={CARD_PHYSICS.FRICTION}
          restitution={CARD_PHYSICS.RESTITUTION}
        />
        <mesh
          ref={meshRef}
          name={sceneObjectName('deck-card', card.id)}
          geometry={getCardGeometry()}
          material={materials}
          scale={scale}
          castShadow={castShadow}
          receiveShadow
          renderOrder={CARD_STACKING.BASE_RENDER_ORDER + playOrder}
        />
      </RigidBody>
    );
  }
);

PhysicsCard3D.displayName = 'PhysicsCard3D';
