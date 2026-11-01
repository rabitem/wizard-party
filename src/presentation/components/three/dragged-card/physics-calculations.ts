// =============================================================================
// PHYSICS CALCULATION FUNCTIONS
// Pure functions for calculating collision and push physics
// =============================================================================

import { TRUMP_ZONE_PHYSICS } from '../../../config/rapier.config';
import { frameDecay, frameLerp } from '../../../config/physics-utils';
import { DRAG_COLLISION_SMOOTHING, PUSH_PHYSICS } from './push-physics.config';
import { CollidingCard, DraggedCardPhysicsState } from './types';

/** Extra push-out per unit of soft collision intensity */
const SOFT_COLLISION_PUSH = 0.3;

/**
 * Calculate trump zone collision effects.
 * Returns the modified target position and collision intensity.
 */
export function calculateTrumpCollision(
  p: DraggedCardPhysicsState,
  targetX: number,
  targetZ: number,
  isCollidingWithTrump: boolean,
  dt: number
): { targetX: number; targetZ: number; collisionIntensity: number } {
  const hardRadius = TRUMP_ZONE_PHYSICS.HARD_RADIUS;
  const softRadius = TRUMP_ZONE_PHYSICS.SOFT_RADIUS;

  const targetDist = Math.sqrt(targetX * targetX + targetZ * targetZ);
  let collisionIntensity = 0;

  if (targetDist < softRadius || isCollidingWithTrump) {
    const dirLength = Math.max(targetDist, 0.01);
    let dirX = targetX / dirLength;
    let dirZ = targetZ / dirLength;

    if (targetDist < 0.01) {
      dirX = 1;
      dirZ = 0;
    }

    if (targetDist < hardRadius) {
      // HARD COLLISION - push to boundary
      collisionIntensity = 1;
      targetX = dirX * hardRadius;
      targetZ = dirZ * hardRadius;
    } else if (targetDist < softRadius) {
      // SOFT COLLISION - gradual push
      collisionIntensity = 1 - (targetDist - hardRadius) / (softRadius - hardRadius);
      const pushAmount = collisionIntensity * SOFT_COLLISION_PUSH;
      targetX += dirX * pushAmount;
      targetZ += dirZ * pushAmount;
    }

    const normalLerp = frameLerp(DRAG_COLLISION_SMOOTHING.TRUMP_NORMAL_LERP, dt);
    p.collisionNormalX += (dirX - p.collisionNormalX) * normalLerp;
    p.collisionNormalZ += (dirZ - p.collisionNormalZ) * normalLerp;
  }

  return { targetX, targetZ, collisionIntensity };
}

/**
 * Calculate card-to-card push physics.
 */
export function calculateCardPush(
  p: DraggedCardPhysicsState,
  targetX: number,
  targetZ: number,
  collidingCards: Map<string, CollidingCard>
): { pushIntensity: number; pushNormalX: number; pushNormalZ: number } {
  const cardCount = collidingCards.size;

  let pushIntensity = 0;
  let pushNormalX = 0;
  let pushNormalZ = 0;

  if (cardCount > 0) {
    // Calculate aggregate push direction from all colliding cards
    collidingCards.forEach((collidingCard) => {
      try {
        const otherPos = collidingCard.rigidBody.translation();
        const dx = targetX - otherPos.x;
        const dz = targetZ - otherPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < PUSH_PHYSICS.SOFT_RADIUS) {
          // Calculate push intensity based on overlap
          const normalizedDist = Math.max(dist, 0.01);
          const dirX = dx / normalizedDist;
          const dirZ = dz / normalizedDist;

          // Intensity ramps up as distance decreases
          let intensity = 0;
          if (dist < PUSH_PHYSICS.HARD_RADIUS) {
            intensity = 1;
          } else {
            intensity = 1 - (dist - PUSH_PHYSICS.HARD_RADIUS) /
                       (PUSH_PHYSICS.SOFT_RADIUS - PUSH_PHYSICS.HARD_RADIUS);
          }

          // Accumulate push direction weighted by intensity
          pushNormalX += dirX * intensity;
          pushNormalZ += dirZ * intensity;
          pushIntensity = Math.max(pushIntensity, intensity);
        }
      } catch {
        // Rigid body may be disposed, ignore
      }
    });

    // Normalize push direction if we have any push
    const pushMag = Math.sqrt(pushNormalX * pushNormalX + pushNormalZ * pushNormalZ);
    if (pushMag > 0.01) {
      pushNormalX /= pushMag;
      pushNormalZ /= pushMag;

      // Factor in velocity for momentum-based push direction
      const velMag = Math.sqrt(p.velX * p.velX + p.velZ * p.velZ);
      if (velMag > 0.5) {
        const velNormX = p.velX / velMag;
        const velNormZ = p.velZ / velMag;
        // Blend push direction with velocity direction
        pushNormalX = pushNormalX * (1 - PUSH_PHYSICS.VELOCITY_INFLUENCE) +
                     velNormX * PUSH_PHYSICS.VELOCITY_INFLUENCE;
        pushNormalZ = pushNormalZ * (1 - PUSH_PHYSICS.VELOCITY_INFLUENCE) +
                     velNormZ * PUSH_PHYSICS.VELOCITY_INFLUENCE;
      }
    }
  }

  return { pushIntensity, pushNormalX, pushNormalZ };
}

export interface PushPhysicsParams {
  p: DraggedCardPhysicsState;
  dt: number;
  pushIntensity: number;
  pushNormalX: number;
  pushNormalZ: number;
  cardCount: number;
}

/**
 * Update push physics state and visual effects.
 */
export function updatePushPhysics(params: PushPhysicsParams): void {
  const { p, dt, pushIntensity, pushNormalX, pushNormalZ, cardCount } = params;
  const smoothing = DRAG_COLLISION_SMOOTHING;
  // Smooth push physics state
  p.pushIntensity += (pushIntensity - p.pushIntensity) * frameLerp(smoothing.PUSH_INTENSITY_LERP, dt);
  const normalLerp = frameLerp(smoothing.PUSH_NORMAL_LERP, dt);
  p.pushNormalX += (pushNormalX - p.pushNormalX) * normalLerp;
  p.pushNormalZ += (pushNormalZ - p.pushNormalZ) * normalLerp;

  // Calculate push offset to prevent overlap
  const pushOffset = p.pushIntensity * PUSH_PHYSICS.PUSH_FORCE;
  const targetPushOffsetX = p.pushNormalX * pushOffset;
  const targetPushOffsetZ = p.pushNormalZ * pushOffset;
  const offsetLerp = frameLerp(PUSH_PHYSICS.PUSH_LERP, dt);
  p.pushOffsetX += (targetPushOffsetX - p.pushOffsetX) * offsetLerp;
  p.pushOffsetZ += (targetPushOffsetZ - p.pushOffsetZ) * offsetLerp;

  // Calculate push visual effects
  const liftTiltLerp = frameLerp(smoothing.PUSH_LIFT_TILT_LERP, dt);
  const targetPushLift = Math.min(cardCount * PUSH_PHYSICS.LIFT_PER_CARD, PUSH_PHYSICS.MAX_LIFT) * p.pushIntensity;
  p.pushLift += (targetPushLift - p.pushLift) * liftTiltLerp;

  // Push tilt - tilt away from collision
  const targetPushTiltX = -p.pushNormalZ * p.pushIntensity * PUSH_PHYSICS.COLLISION_TILT;
  const targetPushTiltZ = p.pushNormalX * p.pushIntensity * PUSH_PHYSICS.COLLISION_TILT;
  p.pushTiltX += (targetPushTiltX - p.pushTiltX) * liftTiltLerp;
  p.pushTiltZ += (targetPushTiltZ - p.pushTiltZ) * liftTiltLerp;

  // Push wobble - faster wobble during collision
  if (p.pushIntensity > 0.1) {
    p.pushWobblePhase += dt * smoothing.PUSH_WOBBLE_SPEED * p.pushIntensity;
  } else {
    p.pushWobblePhase *= frameDecay(smoothing.PUSH_WOBBLE_DECAY, dt);
  }

  // Scale pulse during collision
  const targetScalePulse = p.pushIntensity * PUSH_PHYSICS.SCALE_PULSE *
                          Math.sin(p.pushWobblePhase * 3);
  p.pushScalePulse += (targetScalePulse - p.pushScalePulse) * frameLerp(smoothing.PUSH_SCALE_PULSE_LERP, dt);
}

/**
 * Update collision visual effects for trump zone.
 */
export function updateCollisionVisualEffects(
  p: DraggedCardPhysicsState,
  targetY: number,
  dt: number
): number {
  if (p.collisionIntensity > 0.01) {
    const lerp = frameLerp(DRAG_COLLISION_SMOOTHING.TRUMP_LIFT_TILT_LERP, dt);
    const targetLift = p.collisionIntensity * TRUMP_ZONE_PHYSICS.COLLISION_LIFT;
    p.collisionLift += (targetLift - p.collisionLift) * lerp;
    targetY += p.collisionLift;

    const tiltStrength = p.collisionIntensity * TRUMP_ZONE_PHYSICS.COLLISION_TILT;
    p.collisionTiltX += (-p.collisionNormalZ * tiltStrength - p.collisionTiltX) * lerp;
    p.collisionTiltZ += (p.collisionNormalX * tiltStrength - p.collisionTiltZ) * lerp;
  } else {
    const decay = frameDecay(DRAG_COLLISION_SMOOTHING.TRUMP_RELEASE_DECAY, dt);
    p.collisionLift *= decay;
    p.collisionTiltX *= decay;
    p.collisionTiltZ *= decay;
  }

  return targetY;
}
