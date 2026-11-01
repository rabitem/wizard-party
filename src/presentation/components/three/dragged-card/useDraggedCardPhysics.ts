'use client';

import { useRef, useCallback, MutableRefObject } from 'react';
import * as THREE from 'three';
import { RapierRigidBody } from '@react-three/rapier';
import {
  DRAG_CONFIG,
  FEEDBACK_CONFIG,
  SPRING_CONFIG,
  clamp,
  frameLerp,
} from '../../../config/physics.config';
import { TRUMP_ZONE_PHYSICS } from '../../../config/rapier.config';
import { constrainToHorizontalRadius } from '../../../utils/physics-boundary';
import type { DragState } from '../../../hooks/useDragToPlay';
import { DRAG_COLLISION_SMOOTHING, PUSH_PHYSICS } from './push-physics.config';
import {
  CollidingCard,
  DraggedCardPhysicsState,
  IntersectionPayload,
} from './types';
import {
  calculateTrumpCollision,
  calculateCardPush,
  updatePushPhysics,
  updateCollisionVisualEffects,
} from './physics-calculations';

export interface PhysicsUpdateParams {
  delta: number;
  worldPosition: THREE.Vector3;
  playZoneProximity: number;
  baseScale: number;
  isCollidingWithTrump: boolean;
  collidingCards: Map<string, CollidingCard>;
  rigidBodyRef: MutableRefObject<RapierRigidBody | null>;
  groupRef: MutableRefObject<THREE.Group | null>;
  onTrumpCollision?: (intensity: number) => void;
  onCardPush?: (intensity: number) => void;
}

/**
 * Creates initial physics state for dragged card.
 */
export function createInitialPhysicsState(
  worldPosition: THREE.Vector3,
  baseScale: number
): DraggedCardPhysicsState {
  return {
    posX: worldPosition.x,
    posY: DRAG_CONFIG.DRAG_ELEVATION_BASE,
    posZ: worldPosition.z,
    lastX: worldPosition.x,
    lastZ: worldPosition.z,
    velX: 0,
    velZ: 0,
    tiltX: 0,
    tiltZ: 0,
    scale: baseScale * DRAG_CONFIG.SCALE_MULTIPLIER,
    wobblePhase: 0,
    // Trump zone collision
    collisionIntensity: 0,
    collisionNormalX: 0,
    collisionNormalZ: 0,
    collisionLift: 0,
    collisionTiltX: 0,
    collisionTiltZ: 0,
    // Card-to-card push physics
    pushIntensity: 0,
    pushOffsetX: 0,
    pushOffsetZ: 0,
    pushNormalX: 0,
    pushNormalZ: 0,
    pushLift: 0,
    pushTiltX: 0,
    pushTiltZ: 0,
    pushWobblePhase: 0,
    pushScalePulse: 0,
  };
}

/**
 * Whether the dragged card should follow the live drag state. After release the drag
 * state is reset (or belongs to another card), and the card holds its last pose.
 */
export function isFollowingDrag(dragState: Pick<DragState, 'isDragging' | 'cardId'>, cardId: string): boolean {
  return dragState.isDragging && dragState.cardId === cardId;
}

/**
 * Main physics update function called every frame.
 */
export function updatePhysics(params: PhysicsUpdateParams, p: DraggedCardPhysicsState): void {
  const {
    delta,
    worldPosition,
    playZoneProximity,
    baseScale,
    isCollidingWithTrump,
    collidingCards,
    rigidBodyRef,
    groupRef,
    onTrumpCollision,
    onCardPush,
  } = params;

  if (!groupRef.current) return;

  const dt = Math.min(delta, 0.05);
  const hardRadius = TRUMP_ZONE_PHYSICS.HARD_RADIUS;

  // ===========================================
  // TRUMP COLLISION
  // ===========================================
  let targetX = worldPosition.x;
  let targetZ = worldPosition.z;
  let targetY = DRAG_CONFIG.DRAG_ELEVATION_BASE +
                playZoneProximity * DRAG_CONFIG.DRAG_ELEVATION_PROXIMITY;

  const trumpResult = calculateTrumpCollision(p, targetX, targetZ, isCollidingWithTrump, dt);
  targetX = trumpResult.targetX;
  targetZ = trumpResult.targetZ;

  p.collisionIntensity += (trumpResult.collisionIntensity - p.collisionIntensity) * frameLerp(DRAG_COLLISION_SMOOTHING.TRUMP_INTENSITY_LERP, dt);

  // Notify parent of collision intensity
  if (onTrumpCollision && p.collisionIntensity > 0.01) {
    onTrumpCollision(p.collisionIntensity);
  }

  // ===========================================
  // CARD-TO-CARD PUSH PHYSICS
  // ===========================================
  const cardCount = collidingCards.size;
  const pushResult = calculateCardPush(p, targetX, targetZ, collidingCards);

  updatePushPhysics({
    p,
    dt,
    pushIntensity: pushResult.pushIntensity,
    pushNormalX: pushResult.pushNormalX,
    pushNormalZ: pushResult.pushNormalZ,
    cardCount,
  });

  // Notify parent of push intensity
  if (onCardPush && p.pushIntensity > 0.05) {
    onCardPush(p.pushIntensity);
  }

  // ===========================================
  // POSITION INTERPOLATION
  // ===========================================
  // Apply push offset to target position
  targetX += p.pushOffsetX;
  targetZ += p.pushOffsetZ;

  const followLerp = frameLerp(SPRING_CONFIG.LERP_SPEED.FAST, dt);
  p.posX = p.posX + (targetX - p.posX) * followLerp;
  p.posZ = p.posZ + (targetZ - p.posZ) * followLerp;

  // Final collision enforcement
  const boundedPosition = constrainToHorizontalRadius(
    { x: p.posX, z: p.posZ },
    hardRadius,
    { x: p.lastX, z: p.lastZ }
  );
  p.posX = boundedPosition.x;
  p.posZ = boundedPosition.z;

  // ===========================================
  // COLLISION VISUAL EFFECTS
  // ===========================================
  targetY += p.pushLift;
  targetY = updateCollisionVisualEffects(p, targetY, dt);

  const settleLerp = frameLerp(SPRING_CONFIG.LERP_SPEED.MEDIUM, dt);
  p.posY = p.posY + (targetY - p.posY) * settleLerp;

  // Calculate velocity for tilt
  p.velX = (p.posX - p.lastX) / dt;
  p.velZ = (p.posZ - p.lastZ) / dt;
  p.lastX = p.posX;
  p.lastZ = p.posZ;

  // ===========================================
  // TILT (velocity-based + collision)
  // ===========================================
  const targetTiltX = clamp(
    -p.velZ * FEEDBACK_CONFIG.VELOCITY_TILT_FACTOR,
    -FEEDBACK_CONFIG.MAX_TILT,
    FEEDBACK_CONFIG.MAX_TILT
  );
  const targetTiltZ = clamp(
    p.velX * FEEDBACK_CONFIG.VELOCITY_TILT_FACTOR,
    -FEEDBACK_CONFIG.MAX_TILT,
    FEEDBACK_CONFIG.MAX_TILT
  );

  const tiltLerp = frameLerp(SPRING_CONFIG.TILT_LERP_SPEED, dt);
  p.tiltX = p.tiltX + (targetTiltX - p.tiltX) * tiltLerp;
  p.tiltZ = p.tiltZ + (targetTiltZ - p.tiltZ) * tiltLerp;

  // ===========================================
  // SCALE & WOBBLE
  // ===========================================
  const targetScale = baseScale * DRAG_CONFIG.SCALE_MULTIPLIER;
  p.scale = p.scale + (targetScale - p.scale) * settleLerp;

  // Add push scale pulse effect
  const finalScale = p.scale + p.pushScalePulse;

  p.wobblePhase += dt * FEEDBACK_CONFIG.WOBBLE_SPEED.X;

  // Enhanced wobble during push collision
  const pushWobbleIntensity = p.pushIntensity * PUSH_PHYSICS.COLLISION_WOBBLE;
  const baseWobbleX = Math.sin(p.wobblePhase) * FEEDBACK_CONFIG.WOBBLE_INTENSITY.DRAG;
  const baseWobbleZ = Math.cos(p.wobblePhase * 0.85) * FEEDBACK_CONFIG.WOBBLE_INTENSITY.DRAG * 0.8;
  const pushWobbleX = Math.sin(p.pushWobblePhase) * pushWobbleIntensity;
  const pushWobbleZ = Math.cos(p.pushWobblePhase * 1.3) * pushWobbleIntensity * 0.7;
  const wobbleX = baseWobbleX + pushWobbleX;
  const wobbleZ = baseWobbleZ + pushWobbleZ;

  // ===========================================
  // UPDATE KINEMATIC BODY POSITION
  // ===========================================
  if (rigidBodyRef.current) {
    rigidBodyRef.current.setNextKinematicTranslation({
      x: p.posX,
      y: p.posY,
      z: p.posZ,
    });
  }

  // ===========================================
  // APPLY VISUAL TRANSFORMS
  // ===========================================
  groupRef.current.position.set(p.posX, p.posY, p.posZ);
  groupRef.current.rotation.set(
    -Math.PI / 2 + p.tiltX + p.collisionTiltX + p.pushTiltX + wobbleX,
    0,
    p.tiltZ + p.collisionTiltZ + p.pushTiltZ + wobbleZ
  );
  groupRef.current.scale.setScalar(finalScale);
}

/**
 * Hook for managing collision state and handlers.
 */
export function useDraggedCardCollisions() {
  const collidingCardsRef = useRef<Map<string, CollidingCard>>(new Map());

  const handleIntersectionEnter = useCallback((
    payload: IntersectionPayload,
    setIsCollidingWithTrump: (value: boolean) => void
  ) => {
    const userData = payload.other.rigidBodyObject?.userData;
    if (userData?.cardId && payload.other.rigidBody) {
      // Collision with another card - store rigid body reference for position-based push
      collidingCardsRef.current.set(userData.cardId, {
        id: userData.cardId,
        rigidBody: payload.other.rigidBody,
      });
    } else if (!userData?.cardId) {
      // Collision with trump zone
      setIsCollidingWithTrump(true);
    }
  }, []);

  const handleIntersectionExit = useCallback((
    payload: IntersectionPayload,
    setIsCollidingWithTrump: (value: boolean) => void
  ) => {
    const userData = payload.other.rigidBodyObject?.userData;
    if (userData?.cardId) {
      // Exiting collision with another card - remove from tracking
      collidingCardsRef.current.delete(userData.cardId);
    } else if (!userData?.cardId) {
      // Exiting trump zone
      setIsCollidingWithTrump(false);
    }
  }, []);

  return {
    collidingCardsRef,
    handleIntersectionEnter,
    handleIntersectionExit,
  };
}
