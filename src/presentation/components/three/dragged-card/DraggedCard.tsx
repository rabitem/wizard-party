'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS } from '../../../utils/card-texture';
import { getCardGeometry } from '../../../utils/card-geometry';
import { useCardMaterials } from '../../../hooks/useCardMaterials';
import { DRAG_CONFIG } from '../../../config/physics.config';
import {
  CARD_PHYSICS,
  COLLISION_GROUPS,
  interactionGroups,
} from '../../../config/rapier.config';
import { DraggedCardProps, IntersectionPayload } from './types';
import {
  createInitialPhysicsState,
  isFollowingDrag,
  updatePhysics,
  useDraggedCardCollisions,
} from './useDraggedCardPhysics';
import { sceneObjectName } from '../scene-object-names';

/**
 * Card rendered in world space during drag operations.
 * Uses Rapier kinematic body for physics-based collision detection.
 */
export function DraggedCard({
  card,
  worldPosition,
  playZoneProximity,
  dragStateRef,
  baseScale = 0.65,
  onTrumpCollision,
  onCardPush,
}: DraggedCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // Collision state from Rapier
  const [isCollidingWithTrump, setIsCollidingWithTrump] = useState(false);
  const {
    collidingCardsRef,
    handleIntersectionEnter,
    handleIntersectionExit,
  } = useDraggedCardCollisions();

  // Physics state for visual effects
  const physics = useRef(createInitialPhysicsState(worldPosition, baseScale));
  // Mount pose only: useFrame owns the transform afterwards, so a re-render with a newer
  // position prop cannot snap a held (frozen) card.
  const [initialPosition] = useState<[number, number, number]>(() => [worldPosition.x, DRAG_CONFIG.DRAG_ELEVATION_BASE, worldPosition.z]);

  // Create materials (rebuilt on card theme changes, disposed by the hook)
  const materials = useCardMaterials(card);

  // Handle intersection enter - differentiate between trump zone and cards
  const onIntersectionEnter = useCallback((payload: IntersectionPayload) => {
    handleIntersectionEnter(payload, setIsCollidingWithTrump);
  }, [handleIntersectionEnter]);

  // Handle intersection exit
  const onIntersectionExit = useCallback((payload: IntersectionPayload) => {
    handleIntersectionExit(payload, setIsCollidingWithTrump);
  }, [handleIntersectionExit]);

  useFrame((state, delta) => {
    // Once released, the drag state is reset: keep the release pose (held play) instead of
    // following the reset state toward the table origin.
    if (dragStateRef && !isFollowingDrag(dragStateRef.current, card.id)) return;
    const liveWorldPosition = dragStateRef?.current.worldPosition ?? worldPosition;
    const livePlayZoneProximity = dragStateRef?.current.playZoneProximity ?? playZoneProximity;

    updatePhysics(
      {
        delta,
        worldPosition: liveWorldPosition,
        playZoneProximity: livePlayZoneProximity,
        baseScale,
        isCollidingWithTrump,
        collidingCards: collidingCardsRef.current,
        rigidBodyRef,
        groupRef,
        onTrumpCollision,
        onCardPush,
      },
      physics.current
    );
  });

  return (
    <>
      {/* Kinematic rigid body for collision detection */}
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        position={initialPosition}
        collisionGroups={interactionGroups(
          CARD_PHYSICS.COLLISION_MEMBERSHIP,
          COLLISION_GROUPS.TRUMP_ZONE | COLLISION_GROUPS.CARD | COLLISION_GROUPS.DECORATION | COLLISION_GROUPS.TRUMP_INDICATOR
        )}
        onIntersectionEnter={onIntersectionEnter}
        onIntersectionExit={onIntersectionExit}
        sensor
      >
        {/* Collider NOT rotated, so use pre-rotated dimensions for lying-flat card */}
        <CuboidCollider
          args={[
            (CARD_WIDTH * baseScale * DRAG_CONFIG.SCALE_MULTIPLIER) / 2,  // X = card width
            (CARD_THICKNESS * baseScale) / 2,                              // Y = card thickness (thin)
            (CARD_HEIGHT * baseScale * DRAG_CONFIG.SCALE_MULTIPLIER) / 2, // Z = card height
          ]}
        />
      </RigidBody>

      {/* Visual representation */}
      <group ref={groupRef} name={sceneObjectName('dragged-card', card.id)} position={initialPosition}>
        <mesh geometry={getCardGeometry()} material={materials} castShadow />

        {/* Drop shadow */}
        <mesh
          position={[0.03, -0.01, -DRAG_CONFIG.DRAG_ELEVATION_BASE + 0.02]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[CARD_WIDTH * 0.85, CARD_HEIGHT * 0.85]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}
