'use client';

import { useRef, useCallback } from 'react';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import {
  TRUMP_ZONE_PHYSICS,
  interactionGroups,
} from '../../config/rapier.config';

interface TrumpColliderProps {
  /** Callback when a card enters the trump zone */
  onCardEnter?: (cardId: string) => void;
  /** Callback when a card exits the trump zone */
  onCardExit?: (cardId: string) => void;
  /** Callback with collision intensity (0-1) for visual feedback */
  onCollisionIntensity?: (cardId: string, intensity: number) => void;
}

/**
 * TrumpCollider - Sensor collider at center of table
 * Prevents cards from being placed on the trump indicator
 * Two zones: hard (blocks completely) and soft (gradual push-back)
 */
export function TrumpCollider({
  onCardEnter,
  onCardExit,
  onCollisionIntensity,
}: TrumpColliderProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const cardsInZoneRef = useRef<Set<string>>(new Set());

  // Handle collision enter
  const handleCollisionEnter = useCallback((event: { other: { rigidBodyObject?: { userData?: { cardId?: string } } } }) => {
    const cardId = event.other.rigidBodyObject?.userData?.cardId;
    if (cardId && !cardsInZoneRef.current.has(cardId)) {
      cardsInZoneRef.current.add(cardId);
      onCardEnter?.(cardId);
    }
  }, [onCardEnter]);

  // Handle collision exit
  const handleCollisionExit = useCallback((event: { other: { rigidBodyObject?: { userData?: { cardId?: string } } } }) => {
    const cardId = event.other.rigidBodyObject?.userData?.cardId;
    if (cardId && cardsInZoneRef.current.has(cardId)) {
      cardsInZoneRef.current.delete(cardId);
      onCardExit?.(cardId);
      onCollisionIntensity?.(cardId, 0);
    }
  }, [onCardExit, onCollisionIntensity]);

  return (
    <>
      {/* Hard collision zone - cards cannot enter */}
      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        position={[0, TRUMP_ZONE_PHYSICS.HEIGHT / 2, 0]}
        collisionGroups={interactionGroups(
          TRUMP_ZONE_PHYSICS.COLLISION_MEMBERSHIP,
          TRUMP_ZONE_PHYSICS.COLLISION_FILTER
        )}
      >
        <CylinderCollider
          args={[TRUMP_ZONE_PHYSICS.HEIGHT / 2, TRUMP_ZONE_PHYSICS.HARD_RADIUS]}
          friction={0}
          restitution={0.8} // Bouncy to push cards away
        />
      </RigidBody>

      {/* Soft collision zone - sensor for feedback */}
      <RigidBody
        type="fixed"
        position={[0, TRUMP_ZONE_PHYSICS.HEIGHT / 2, 0]}
        sensor
        collisionGroups={interactionGroups(
          TRUMP_ZONE_PHYSICS.COLLISION_MEMBERSHIP,
          TRUMP_ZONE_PHYSICS.COLLISION_FILTER
        )}
        onIntersectionEnter={handleCollisionEnter}
        onIntersectionExit={handleCollisionExit}
      >
        <CylinderCollider
          args={[TRUMP_ZONE_PHYSICS.HEIGHT / 2, TRUMP_ZONE_PHYSICS.SOFT_RADIUS]}
        />
      </RigidBody>
    </>
  );
}
