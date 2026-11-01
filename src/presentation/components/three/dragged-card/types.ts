// =============================================================================
// DRAGGED CARD TYPES
// =============================================================================

import { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import type { DragStateRef } from '../../../hooks/useDragToPlay';

/**
 * Represents a card currently colliding with the dragged card.
 */
export interface CollidingCard {
  id: string;
  rigidBody: RapierRigidBody;
}

/**
 * Props for the DraggedCard component.
 */
export interface DraggedCardProps {
  card: ICard;
  worldPosition: THREE.Vector3;
  playZoneProximity: number;
  dragStateRef?: DragStateRef;
  isInPlayZone?: boolean;
  baseScale?: number;
  /** Callback when card enters trump collision zone */
  onTrumpCollision?: (intensity: number) => void;
  /** Callback when card pushes other cards */
  onCardPush?: (intensity: number) => void;
}

/**
 * Physics state for visual effects during drag operations.
 */
export interface DraggedCardPhysicsState {
  posX: number;
  posY: number;
  posZ: number;
  lastX: number;
  lastZ: number;
  velX: number;
  velZ: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  wobblePhase: number;
  // Trump zone collision
  collisionIntensity: number;
  collisionNormalX: number;
  collisionNormalZ: number;
  collisionLift: number;
  collisionTiltX: number;
  collisionTiltZ: number;
  // Card-to-card push physics
  pushIntensity: number;
  pushOffsetX: number;
  pushOffsetZ: number;
  pushNormalX: number;
  pushNormalZ: number;
  pushLift: number;
  pushTiltX: number;
  pushTiltZ: number;
  pushWobblePhase: number;
  pushScalePulse: number;
}

/**
 * Payload for intersection events from Rapier.
 */
export interface IntersectionPayload {
  other: {
    rigidBody?: RapierRigidBody;
    rigidBodyObject?: { userData?: { cardId?: string } };
  };
}
