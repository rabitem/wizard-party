import { DRAG_CONFIG, PLAY_ANIMATION, clamp } from '../../config/physics.config';
import type { DropInfo } from '../../hooks/useDragToPlay';
import type { ServerPhysicsState } from './physics-played-card.types';

export type PositionTuple = [number, number, number];

interface PartialVector {
  x?: number;
  y?: number;
  z?: number;
}

interface ResolveAnimationPositionsParams {
  isLocalPlayer: boolean;
  startPosition: PositionTuple;
  targetPosition: PositionTuple;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
  /** Yaw of the owner's seat in this client's scene (PlayerPosition.rotation) */
  seatRotation?: number;
}

interface ResolvedAnimationPositions {
  effectiveStartPosition: PositionTuple;
  effectiveTargetPosition: PositionTuple;
}

function hasCompleteVector(position: PartialVector | undefined): position is { x: number; y: number; z: number } {
  return Number.isFinite(position?.x) &&
    Number.isFinite(position?.y) &&
    Number.isFinite(position?.z);
}

export function vectorToTuple(position: { x: number; y: number; z: number }): PositionTuple {
  return [position.x, position.y, position.z];
}

/**
 * Rotate a point about +Y by `angle`, matching THREE's Vector3.applyAxisAngle(Y, angle).
 */
function rotateAboutY(position: PositionTuple, angle: number): PositionTuple {
  if (angle === 0) return position;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    position[0] * cos + position[2] * sin,
    position[1],
    -position[0] * sin + position[2] * cos,
  ];
}

/**
 * Synchronized positions are recorded in the thrower's own scene, where every client seats
 * itself at +Z. Rotating by the thrower's seat yaw in this client's scene maps them onto the
 * thrower's actual seat here.
 */
function resolveServerPosition(
  isLocalPlayer: boolean,
  serverPosition: PartialVector | undefined,
  fallback: PositionTuple,
  seatRotation: number
): PositionTuple {
  if (!isLocalPlayer && hasCompleteVector(serverPosition)) {
    return rotateAboutY(vectorToTuple(serverPosition), seatRotation);
  }
  return fallback;
}

export function resolveDropStart(dropInfo: DropInfo | undefined): PositionTuple | null {
  if (!dropInfo?.startPosition) return null;
  return vectorToTuple(dropInfo.startPosition);
}

export function resolveDropTarget(dropInfo: DropInfo | undefined): PositionTuple | null {
  if (!dropInfo?.dropPosition) return null;
  return vectorToTuple(dropInfo.dropPosition);
}

export function resolveCardAnimationPositions({
  isLocalPlayer,
  startPosition,
  targetPosition,
  dropInfo,
  physicsState,
  seatRotation = 0,
}: ResolveAnimationPositionsParams): ResolvedAnimationPositions {
  const serverStartPosition = resolveServerPosition(
    isLocalPlayer, physicsState?.startPosition, startPosition, seatRotation
  );
  const serverTargetPosition = resolveServerPosition(
    isLocalPlayer, physicsState?.landingPosition, targetPosition, seatRotation
  );

  return {
    effectiveStartPosition: isLocalPlayer ? resolveDropStart(dropInfo) ?? serverStartPosition : serverStartPosition,
    effectiveTargetPosition: isLocalPlayer ? resolveDropTarget(dropInfo) ?? serverTargetPosition : serverTargetPosition,
  };
}

function getVectorSpeed(vector: PartialVector | undefined): number | null {
  if (!hasCompleteVector(vector)) return null;
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function isSlowPlayedCardDrop(
  dropInfo?: DropInfo,
  physicsState?: ServerPhysicsState
): boolean {
  if (dropInfo?.isSlowDrop !== undefined) return dropInfo.isSlowDrop;

  const speed = getVectorSpeed(physicsState?.throwVelocity);
  if (speed === null) return false;

  return speed < DRAG_CONFIG.SLOW_DROP_VELOCITY_THRESHOLD;
}

function getPlayedCardThrowSpeed(
  dropInfo?: DropInfo,
  physicsState?: ServerPhysicsState
): number | null {
  return getVectorSpeed(dropInfo?.velocity) ??
    getVectorSpeed(physicsState?.throwVelocity);
}

/**
 * Progress through the airborne part of the animation. The card touches the felt at
 * PLAY_ANIMATION.BOUNCE_START, where the landing impact fires; the rest is the bounce.
 */
export function calculateFlightProgress(rawProgress: number): number {
  return clamp(rawProgress / PLAY_ANIMATION.BOUNCE_START, 0, 1);
}

/**
 * Eased horizontal travel. It completes at touchdown so the card bounces in place instead of
 * sliding across the felt. Slow drops follow their fall curve so they never drift sideways
 * ahead of it.
 */
export function calculateCardAnimationProgress(
  rawProgress: number,
  isSlowDrop: boolean = false
): number {
  const t = calculateFlightProgress(rawProgress);
  if (isSlowDrop) return t * t;
  return t * t * (3 - 2 * t);
}

interface AnimationDurationParams {
  isLocalPlayer: boolean;
  effectiveStartPosition: PositionTuple;
  effectiveTargetPosition: PositionTuple;
  durationMultiplier: number;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
}

function getBaseDuration(isLocalPlayer: boolean, isSlowDrop: boolean): number {
  const throwDuration = isLocalPlayer
    ? PLAY_ANIMATION.LOCAL_DURATION
    : PLAY_ANIMATION.OPPONENT_DURATION;

  if (isSlowDrop) {
    return Math.max(PLAY_ANIMATION.SLOW_DROP_DURATION, throwDuration);
  }
  return throwDuration;
}

export function calculateCardAnimationDuration({
  isLocalPlayer,
  effectiveStartPosition,
  effectiveTargetPosition,
  durationMultiplier,
  dropInfo,
  physicsState,
}: AnimationDurationParams): number {
  const isSlowDrop = isSlowPlayedCardDrop(dropInfo, physicsState);
  const horizontalDistance = Math.hypot(
    effectiveTargetPosition[0] - effectiveStartPosition[0],
    effectiveTargetPosition[2] - effectiveStartPosition[2]
  );
  const distanceBonus = Math.min(
    PLAY_ANIMATION.DISTANCE_DURATION_MAX_BONUS,
    horizontalDistance * PLAY_ANIMATION.DISTANCE_DURATION_PER_UNIT
  );
  const speed = getPlayedCardThrowSpeed(dropInfo, physicsState);
  const speedReduction = isSlowDrop || speed === null
    ? 0
    : Math.min(
        PLAY_ANIMATION.SPEED_DURATION_MAX_REDUCTION,
        Math.max(0, speed - DRAG_CONFIG.SLOW_DROP_VELOCITY_THRESHOLD) *
          PLAY_ANIMATION.SPEED_DURATION_REDUCTION_PER_UNIT
      );
  const duration = (getBaseDuration(isLocalPlayer, isSlowDrop) + distanceBonus - speedReduction) *
    durationMultiplier;

  return clamp(duration, PLAY_ANIMATION.MIN_DURATION, PLAY_ANIMATION.MAX_DURATION);
}
