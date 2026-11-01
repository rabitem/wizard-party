'use client';

import { useMemo, type ReactNode } from 'react';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS } from '../../utils/card-texture';
import { getCardGeometry } from '../../utils/card-geometry';
import { useCardMaterials } from '../../hooks/useCardMaterials';
import { CardTrail } from './CardTrail';
import { CardLandEffect } from './card-land-fx';
import { CARD_STACKING } from '../../config/physics.config';
import { CARD_PHYSICS, interactionGroups } from '../../config/rapier.config';
import { useCardAnimationOffsets } from './useCardAnimationOffsets';
import { useCardAnimation } from './useCardAnimation';
import type { PhysicsPlayedCardProps } from './physics-played-card.types';
import { sceneObjectName } from './scene-object-names';

// Re-export types for external consumers
export type {
  ServerPhysicsState,
  PendingCardPlay,
} from './physics-played-card.types';

/** Card effects including trail during flight and the themed land effect */
function CardEffects({
  groupRef,
  isAnimating,
  dustActive,
  dustPosition,
  onDustComplete,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  isAnimating: boolean;
  dustActive: boolean;
  dustPosition: [number, number, number];
  onDustComplete: () => void;
}) {
  return (
    <>
      <CardTrail
        targetRef={groupRef}
        color="#ffd700"
        length={10}
        opacity={0.2}
        active={isAnimating}
      />
      <CardLandEffect
        position={dustPosition}
        active={dustActive}
        onComplete={onDustComplete}
      />
    </>
  );
}

/** Kinematic rigid body collider for played cards */
function CardCollider({
  rigidBodyRef,
  effectiveStartPosition,
  scale,
  cardId,
  playOrder,
}: {
  rigidBodyRef: React.RefObject<RapierRigidBody | null>;
  effectiveStartPosition: THREE.Vector3Tuple;
  scale: number;
  cardId: string;
  playOrder: number;
}) {
  // A new userData object makes @react-three/rapier re-apply the body's props, which snaps it
  // back to the (shaking) parent's current pose; keep the identity stable across re-renders.
  const userData = useMemo(() => ({ cardId, playOrder }), [cardId, playOrder]);
  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      position={effectiveStartPosition}
      collisionGroups={interactionGroups(CARD_PHYSICS.COLLISION_MEMBERSHIP, CARD_PHYSICS.COLLISION_FILTER)}
      userData={userData}
    >
      <CuboidCollider
        args={[
          (CARD_WIDTH * scale) / 2,
          (CARD_HEIGHT * scale) / 2,
          (CARD_THICKNESS * scale) / 2,
        ]}
        friction={CARD_PHYSICS.FRICTION}
        restitution={CARD_PHYSICS.RESTITUTION}
      />
    </RigidBody>
  );
}

/** Visual card mesh with materials */
function CardMesh({
  name,
  groupRef,
  meshRef,
  materials,
  effectiveStartPosition,
  playOrder,
  children,
}: {
  name: string;
  groupRef: React.RefObject<THREE.Group | null>;
  meshRef: React.RefObject<THREE.Mesh | null>;
  materials: THREE.Material[];
  effectiveStartPosition: THREE.Vector3Tuple;
  playOrder: number;
  children?: ReactNode;
}) {
  return (
    <group ref={groupRef} name={name} position={effectiveStartPosition}>
      <mesh
        ref={meshRef}
        geometry={getCardGeometry()}
        material={materials}
        castShadow
        receiveShadow
        renderOrder={CARD_STACKING.BASE_RENDER_ORDER + playOrder}
      />
      {children}
    </group>
  );
}

/**
 * PhysicsPlayedCard - Card with scripted animation and kinematic physics for collision
 * Uses scripted animation for predictable flight, kinematic RigidBody for collision detection
 */
export function PhysicsPlayedCard({
  card,
  targetPosition,
  targetRotation,
  startPosition,
  scale = 0.9,
  isLocalPlayer = false,
  cardId,
  onImpact,
  onAnimationComplete,
  playOrder = 0,
  totalCards = 1,
  dropInfo,
  physicsState,
  originPose,
  seatRotation,
  children,
}: PhysicsPlayedCardProps) {
  // Generate consistent random offsets for this specific card
  const randomOffsets = useCardAnimationOffsets({
    cardId,
    isLocalPlayer,
    physicsState,
  });

  // Set up animation with all the physics simulation logic
  const {
    groupRef,
    rigidBodyRef,
    meshRef,
    isAnimating,
    dustActive,
    dustPosition,
    setDustActive,
    effectiveStartPosition,
  } = useCardAnimation({
    cardId,
    isLocalPlayer,
    targetPosition,
    targetRotation,
    startPosition,
    scale,
    playOrder,
    totalCards,
    dropInfo,
    physicsState,
    originPose,
    seatRotation,
    randomOffsets,
    onImpact,
    onAnimationComplete,
  });

  // Set up materials
  const materials = useCardMaterials(card);

  return (
    <>
      <CardEffects
        groupRef={groupRef}
        isAnimating={isAnimating}
        dustActive={dustActive}
        dustPosition={dustPosition}
        onDustComplete={() => setDustActive(false)}
      />
      <CardCollider
        rigidBodyRef={rigidBodyRef}
        effectiveStartPosition={effectiveStartPosition}
        scale={scale}
        cardId={card.id}
        playOrder={playOrder}
      />
      <CardMesh
        name={sceneObjectName('played-card', card.id)}
        groupRef={groupRef}
        meshRef={meshRef}
        materials={materials}
        effectiveStartPosition={effectiveStartPosition}
        playOrder={playOrder}
      >
        {children}
      </CardMesh>
    </>
  );
}
