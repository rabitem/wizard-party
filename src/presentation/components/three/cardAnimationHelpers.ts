import * as THREE from 'three';
import { RapierRigidBody } from '@react-three/rapier';
import {
  CARD_DIMENSIONS,
  CARD_STACKING,
  PLAY_ANIMATION,
  TABLE_SURFACE,
  easeOutCubic,
} from '../../config/physics.config';
import { TABLE_PHYSICS, TRUMP_ZONE_PHYSICS } from '../../config/rapier.config';
import {
  constrainToHorizontalBand,
  getRectangularFootprintClearanceRadius,
} from '../../utils/physics-boundary';
import {
  calculateFlipProgress,
  calculateArcHeight,
  applyAirResistance,
  calculateBounce,
  calculateWobble,
  calculateFlightSpin,
  calculateReleaseSpin,
  calculateTumble,
  calculateVelocityTilt,
} from './cardAnimationPhysics';
import {
  calculateCardAnimationProgress,
  calculateFlightProgress,
  isSlowPlayedCardDrop,
  resolveDropStart,
  resolveDropTarget,
  type PositionTuple,
} from './cardAnimationMotion';
import type { CardAnimationOffsets, ServerPhysicsState } from './physics-played-card.types';
import type { DropInfo } from '../../hooks/useDragToPlay';

export {
  calculateCardAnimationDuration,
  calculateCardAnimationProgress,
  isSlowPlayedCardDrop,
  resolveCardAnimationPositions,
} from './cardAnimationMotion';

interface PositionParams {
  rawProgress: number;
  posProgress: number;
  effectiveStartPosition: [number, number, number];
  effectiveTargetPosition: [number, number, number];
  /** Rendered pose the card leaves from (hand or dragged card); only moves the flight's start */
  originPosition?: PositionTuple;
  targetRotation?: [number, number, number];
  randomOffsets: CardAnimationOffsets;
  playOrder: number;
  totalCards: number;
  cardScale?: number;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
  isLocalPlayer: boolean;
}

function getPlayedCardTrumpClearanceRadius(cardScale: number = 1): number {
  return getRectangularFootprintClearanceRadius(
    TRUMP_ZONE_PHYSICS.HARD_RADIUS,
    CARD_DIMENSIONS.WIDTH,
    CARD_DIMENSIONS.HEIGHT,
    cardScale,
    TABLE_SURFACE.EPSILON
  );
}

function getPlayedCardTableEdgeRadius(cardScale: number = 1): number {
  const cardHalfDiagonal = getRectangularFootprintClearanceRadius(
    0,
    CARD_DIMENSIONS.WIDTH,
    CARD_DIMENSIONS.HEIGHT,
    cardScale,
    TABLE_SURFACE.EPSILON
  );

  return Math.max(0, TABLE_PHYSICS.RADIUS - cardHalfDiagonal);
}

function calculateRotatedCardVerticalHalfExtent({
  rotationX,
  rotationY = 0,
  rotationZ,
  cardScale = 1,
}: {
  rotationX: number;
  rotationY?: number;
  rotationZ: number;
  cardScale?: number;
}): number {
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotationX, rotationY, rotationZ, 'YXZ')
  );
  const elements = matrix.elements;
  const halfWidth = (CARD_DIMENSIONS.WIDTH * cardScale) / 2;
  const halfHeight = (CARD_DIMENSIONS.HEIGHT * cardScale) / 2;
  const halfThickness = (CARD_DIMENSIONS.THICKNESS * cardScale) / 2;

  return (
    Math.abs(elements[1]) * halfWidth +
    Math.abs(elements[5]) * halfHeight +
    Math.abs(elements[9]) * halfThickness
  );
}

export function getRotatedPlayedCardRestY({
  rotationX,
  rotationY,
  rotationZ,
  cardScale,
}: {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  cardScale: number;
}): number {
  return TABLE_SURFACE.FELT_Y +
    TABLE_SURFACE.EPSILON +
    calculateRotatedCardVerticalHalfExtent({
      rotationX,
      rotationY,
      rotationZ,
      cardScale,
    });
}

export function isLandingImpactProgress(rawProgress: number): boolean {
  return rawProgress >= PLAY_ANIMATION.BOUNCE_START;
}

export function isCardAnimationComplete(rawProgress: number): boolean {
  return rawProgress >= 1;
}

function getAnimationStartPosition(
  effectiveStartPosition: PositionTuple,
  dropInfo?: DropInfo
): PositionTuple {
  return resolveDropStart(dropInfo) ?? effectiveStartPosition;
}

function getAnimationTargetPosition(
  effectiveTargetPosition: PositionTuple,
  dropInfo?: DropInfo
): PositionTuple {
  return resolveDropTarget(dropInfo) ?? effectiveTargetPosition;
}

export function calculateCardPosition({
  rawProgress,
  posProgress,
  effectiveStartPosition,
  effectiveTargetPosition,
  originPosition,
  targetRotation = [-Math.PI / 2, 0, 0],
  randomOffsets,
  playOrder,
  totalCards,
  cardScale = 1,
  dropInfo,
  physicsState,
  isLocalPlayer,
}: PositionParams): THREE.Vector3 {
  const isSlowDrop = isSlowPlayedCardDrop(dropInfo, physicsState);
  const animationStartPosition = getAnimationStartPosition(effectiveStartPosition, dropInfo);
  const animationTargetPosition = getAnimationTargetPosition(effectiveTargetPosition, dropInfo);
  const flightStartPosition = originPosition ?? animationStartPosition;
  // The descent ends on the felt at BOUNCE_START, when the impact fires; only the bounce follows
  const flightProgress = calculateFlightProgress(rawProgress);
  const arcY = isSlowDrop
    ? 0
    : calculateArcHeight(flightProgress, isLocalPlayer, randomOffsets.throwStrength);
  const effectiveArcY = applyAirResistance(arcY, flightProgress);
  const { bounceY } = calculateBounce(rawProgress, randomOffsets.bounceStrength);

  const stackHeight = playOrder * CARD_STACKING.HEIGHT_PER_CARD;
  const centerPull = totalCards > 1
    ? playOrder * CARD_STACKING.CENTER_PULL_FACTOR / (totalCards - 1)
    : 0;

  const restY = getRotatedPlayedCardRestY({
    rotationX: targetRotation[0] + randomOffsets.finalRotX,
    rotationY: targetRotation[1],
    rotationZ: targetRotation[2] + randomOffsets.finalRotZ,
    cardScale,
  });
  const finalPosY = Math.max(animationTargetPosition[1], restY) + randomOffsets.posY + stackHeight;
  let finalPosX: number;
  let finalPosZ: number;

  finalPosX = animationTargetPosition[0] * (1 - centerPull) + randomOffsets.posX;
  finalPosZ = animationTargetPosition[2] * (1 - centerPull) + randomOffsets.posZ;

  const boundedPosition = constrainToHorizontalBand(
    { x: finalPosX, z: finalPosZ },
    {
      minRadius: getPlayedCardTrumpClearanceRadius(cardScale),
      maxRadius: getPlayedCardTableEdgeRadius(cardScale),
    },
    { x: animationStartPosition[0], z: animationStartPosition[2] }
  );
  finalPosX = boundedPosition.x;
  finalPosZ = boundedPosition.z;

  const verticalProgress = calculateCardAnimationProgress(rawProgress, isSlowDrop);
  const baseY = THREE.MathUtils.lerp(flightStartPosition[1], finalPosY, verticalProgress) +
    Math.max(effectiveArcY, 0) + bounceY;

  return new THREE.Vector3(
    THREE.MathUtils.lerp(flightStartPosition[0], finalPosX, posProgress),
    Math.max(baseY, restY),
    THREE.MathUtils.lerp(flightStartPosition[2], finalPosZ, posProgress)
  );
}

interface RotationParams {
  rawProgress: number;
  posProgress: number;
  elapsedTime: number;
  isLocalPlayer: boolean;
  targetRotation: [number, number, number];
  randomOffsets: CardAnimationOffsets;
  isSlowDrop?: boolean;
}

interface RotationResult {
  x: number;
  y: number;
  z: number;
}

export function calculateCardRotation({
  rawProgress,
  posProgress,
  elapsedTime,
  isLocalPlayer,
  targetRotation,
  randomOffsets,
  isSlowDrop = false,
}: RotationParams): RotationResult {
  const flipProgress = calculateFlipProgress(rawProgress, isLocalPlayer);
  const bounceStrength = isSlowDrop
    ? randomOffsets.bounceStrength * PLAY_ANIMATION.SLOW_DROP_BOUNCE_FACTOR
    : randomOffsets.bounceStrength;
  const { bounceRotZ, bounceRotX } = calculateBounce(rawProgress, bounceStrength);

  const wobbleDecay = 1 - easeOutCubic(rawProgress);
  const spinDecay = 1 - easeOutCubic(rawProgress);
  const { wobbleX, wobbleZ } = isSlowDrop
    ? { wobbleX: 0, wobbleZ: 0 }
    : calculateWobble(rawProgress, elapsedTime, wobbleDecay, randomOffsets);
  const flipAmount = isLocalPlayer ? 0 : Math.PI * (1 - flipProgress);
  const finalRotX = targetRotation[0] + randomOffsets.finalRotX;
  const finalRotZ = targetRotation[2] + randomOffsets.finalRotZ;

  let flightSpin = 0;
  if (!isSlowDrop) {
    flightSpin = isLocalPlayer
      ? calculateReleaseSpin(spinDecay, randomOffsets.flightSpinZ, finalRotZ)
      : calculateFlightSpin(rawProgress, spinDecay, randomOffsets.flightSpinZ);
  }
  const { tumbleX, tumbleY } = isSlowDrop
    ? { tumbleX: 0, tumbleY: 0 }
    : calculateTumble(rawProgress, wobbleDecay, randomOffsets.throwStrength);
  const velocityTiltX = isSlowDrop
    ? 0
    : calculateVelocityTilt(calculateFlightProgress(rawProgress), randomOffsets.throwStrength);

  return {
    x: finalRotX + flipAmount + wobbleX + tumbleX + bounceRotX + velocityTiltX,
    y: THREE.MathUtils.lerp(0, targetRotation[1], posProgress) + tumbleY,
    z: finalRotZ + flightSpin + wobbleZ + bounceRotZ,
  };
}

export function updateRigidBody(
  rigidBodyRef: React.MutableRefObject<RapierRigidBody | null>,
  group: THREE.Group,
  currentPos: THREE.Vector3
): void {
  if (!rigidBodyRef.current) return;

  rigidBodyRef.current.setNextKinematicTranslation({
    x: currentPos.x,
    y: currentPos.y,
    z: currentPos.z,
  });

  const euler = new THREE.Euler(
    group.rotation.x,
    group.rotation.y,
    group.rotation.z,
    'YXZ'
  );
  const quat = new THREE.Quaternion().setFromEuler(euler);
  rigidBodyRef.current.setNextKinematicRotation({
    x: quat.x,
    y: quat.y,
    z: quat.z,
    w: quat.w,
  });
}
