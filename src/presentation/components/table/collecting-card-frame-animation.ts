import * as THREE from "three";
import {
  COLLECT_ANIMATION,
  easeInOutCubic,
  easeOutCubic,
} from "../../config/physics.config";
import type {
  CollectionAnimationProfile,
  CollectionAnimationVariant,
} from "../../config/collection-animation.config";
import {
  COLLECTING_CARD_HOVER_SCALE,
  COLLECTING_CARD_START_SCALE,
  getCollectingFlightPathOffset,
  shortestAngleDelta,
} from "./collecting-card-animation";
import { getHoverBobPhase, getWaitingFormationOffset } from "./collecting-card-formation";

export type CollectingAnimationPhase = 'gathering' | 'waiting' | 'flying' | 'stacked';

export interface PhaseOffsets {
  gatherArcMultiplier: number; flySpinZ: number;
  gatherWobbleX: number; gatherWobbleZ: number;
  flyArcMultiplier: number; durationMult: number;
  seedAngle: number;
}

export interface CollectingCardPose {
  x: number; y: number; z: number; scale: number; rotY: number; rotZ: number;
}

export interface AnimationResult extends CollectingCardPose {
  newPhase?: CollectingAnimationPhase; isComplete?: boolean;
}

interface GatherPhaseParams {
  t: number;
  startPos: [number, number, number];
  startRotation: number;
  hoverPose: CollectingCardPose;
  offsets: PhaseOffsets;
  profile: CollectionAnimationProfile;
}

interface WaitPhaseParams {
  waitElapsed: number;
  centerPos: [number, number, number];
  stackIndex: number;
  collectingCardCount: number;
  startRotation: number;
  offsets: PhaseOffsets;
  variant: CollectionAnimationVariant;
  profile: CollectionAnimationProfile;
}

interface FlyPhaseParams {
  t: number; launchPose: CollectingCardPose; centerPos: [number, number, number]; targetPos: [number, number, number];
  stackedY: number; targetScale: number; offsets: PhaseOffsets;
  /** The winner's yaw, unwrapped to the turn chosen at take-off (getLandingYaw). */
  landingYaw: number;
  variant: CollectionAnimationVariant; profile: CollectionAnimationProfile; stackIndex: number;
}

export interface FrameAnimationParams {
  elapsed: number;
  gatherDuration: number;
  waitDuration: number;
  flyDelay: number;
  flyDuration: number;
  animationPhase: CollectingAnimationPhase;
  startPosition: [number, number, number];
  centerPos: [number, number, number];
  targetPosition: [number, number, number];
  stackedY: number;
  startRotation: number;
  targetRotation: number;
  targetScale: number;
  randomOffsets: PhaseOffsets;
  animationVariant: CollectionAnimationVariant;
  animationProfile: CollectionAnimationProfile;
  stackIndex: number;
  collectingCardCount: number;
}

/** Arc lift that rises like sin(PI * t) but flattens out at t = 1, so the card arrives without vertical speed */
function settlingArc(t: number): number {
  return Math.sin(t * Math.PI) * (1 - t * t * t);
}

/**
 * Each phase starts exactly where the previous one ends: the gather lands on the first hover pose,
 * and the flight launches from the last hover pose. Phase-only flourishes (arcs, wobbles, spins)
 * are zero at both ends of their phase, so no boundary pops position, scale or rotation.
 */
function calcGatherPhase({ t, startPos, startRotation, hoverPose, offsets, profile }: GatherPhaseParams): AnimationResult {
  const eased = easeOutCubic(t);
  const settle = 1 - t;
  const arc = settlingArc(t) * COLLECT_ANIMATION.GATHER_ARC_HEIGHT * offsets.gatherArcMultiplier * profile.gatherArcMultiplier;
  const x = THREE.MathUtils.lerp(startPos[0], hoverPose.x, eased) + Math.sin(t * Math.PI * 4) * 0.02 * settle;
  const z = THREE.MathUtils.lerp(startPos[2], hoverPose.z, eased) + Math.sin(t * Math.PI * 4 * 1.3) * 0.015 * settle;
  const y = THREE.MathUtils.lerp(startPos[1], hoverPose.y, eased) + arc;
  const spin = profile.spinMultiplier;
  return {
    x, y, z,
    scale: THREE.MathUtils.lerp(COLLECTING_CARD_START_SCALE, hoverPose.scale, eased),
    rotY: THREE.MathUtils.lerp(startRotation, hoverPose.rotY, eased) + Math.sin(t * Math.PI * 2) * 0.15 * settle * offsets.gatherArcMultiplier * spin,
    rotZ: hoverPose.rotZ * eased + Math.sin(eased * Math.PI) * 0.1 * offsets.flySpinZ * spin,
    newPhase: 'gathering',
  };
}

function calcWaitPhase({ waitElapsed, centerPos, stackIndex, collectingCardCount, startRotation, offsets, variant, profile }: WaitPhaseParams): AnimationResult {
  const bob = Math.sin(getHoverBobPhase(variant, waitElapsed, stackIndex)) * COLLECT_ANIMATION.HOVER_AMPLITUDE;
  const formation = getWaitingFormationOffset({
    variant, waitElapsed, stackIndex, collectingCardCount,
    seedAngle: offsets.seedAngle, gatherWobbleX: offsets.gatherWobbleX, gatherWobbleZ: offsets.gatherWobbleZ,
  });
  return { x: centerPos[0] + formation[0], y: centerPos[1] + formation[1] + bob, z: centerPos[2] + formation[2],
    scale: COLLECTING_CARD_HOVER_SCALE, rotY: startRotation + Math.sin(waitElapsed * 2 + stackIndex * 0.3) * 0.12 * profile.spinMultiplier, rotZ: Math.sin(waitElapsed * 1.5) * 0.05 * profile.spinMultiplier, newPhase: 'waiting' };
}

function calcFlyPhase({ t, launchPose, centerPos, targetPos, stackedY, landingYaw, targetScale, offsets, variant, profile, stackIndex }: FlyPhaseParams): AnimationResult {
  const eased = easeInOutCubic(t);
  // sin² of linear time: no vertical speed at take-off or landing, and a rounded apex. Driving the
  // arc by the eased progress instead packs the whole apex into a few frames (eased' = 3 at t = 0.5),
  // which reads as the card hitting a ceiling on high arcs.
  const arc = Math.sin(t * Math.PI) ** 2 * COLLECT_ANIMATION.FLY_ARC_HEIGHT * offsets.flyArcMultiplier * profile.flyArcMultiplier;
  const pathOffset = getCollectingFlightPathOffset({
    variant,
    t,
    centerPosition: centerPos,
    targetPosition: targetPos,
    stackIndex,
    seedAngle: offsets.seedAngle,
  });
  const spin = profile.spinMultiplier;
  const yawWobble = (Math.sin(t * Math.PI * 2 + offsets.seedAngle) - Math.sin(offsets.seedAngle)) * 0.1 * (1 - t) * spin;
  return {
    x: THREE.MathUtils.lerp(launchPose.x, targetPos[0], eased) + pathOffset[0],
    y: THREE.MathUtils.lerp(launchPose.y, stackedY, eased) + arc + pathOffset[1],
    z: THREE.MathUtils.lerp(launchPose.z, targetPos[2], eased) + pathOffset[2],
    scale: THREE.MathUtils.lerp(launchPose.scale, targetScale, eased),
    rotY: THREE.MathUtils.lerp(launchPose.rotY, landingYaw, eased) + yawWobble,
    rotZ: launchPose.rotZ * (1 - easeOutCubic(t)) + offsets.flySpinZ * spin * Math.sin(t * Math.PI) * (1 - t),
    newPhase: 'flying',
    isComplete: t >= 1,
  };
}

function calcStackedPhase(targetPos: [number, number, number], stackedY: number, landingYaw: number, targetScale: number): AnimationResult {
  return { x: targetPos[0], y: stackedY, z: targetPos[2], scale: targetScale, rotY: landingYaw, rotZ: 0 };
}

/**
 * The winner's yaw as the flight reaches it: the short way round from the take-off yaw (seat
 * rotations span (-2PI, 0], so a plain lerp can spin up to 300 degrees). The turn is chosen once:
 * choosing it per frame from the bobbing hover yaw flips it when the winner sits almost opposite,
 * a jump of 2PI scaled by the progress.
 */
function getLandingYaw(takeOffYaw: number, targetRotation: number): number {
  return takeOffYaw + shortestAngleDelta(takeOffYaw, targetRotation);
}

export function resolveFrameAnimationResult({
  elapsed,
  gatherDuration,
  waitDuration,
  flyDelay,
  flyDuration,
  animationPhase,
  startPosition,
  centerPos,
  targetPosition,
  stackedY,
  startRotation,
  targetRotation,
  targetScale,
  randomOffsets,
  animationVariant,
  animationProfile,
  stackIndex,
  collectingCardCount,
}: FrameAnimationParams): AnimationResult {
  const hoverPose = (waitElapsed: number) => calcWaitPhase({
    waitElapsed, centerPos, stackIndex, collectingCardCount, startRotation,
    offsets: randomOffsets, variant: animationVariant, profile: animationProfile,
  });
  const hoverDuration = waitDuration + flyDelay;
  const landingYaw = getLandingYaw(hoverPose(hoverDuration).rotY, targetRotation);

  if (elapsed < gatherDuration) {
    return calcGatherPhase({ t: elapsed / gatherDuration, startPos: startPosition, startRotation, hoverPose: hoverPose(0), offsets: randomOffsets, profile: animationProfile });
  }

  if (elapsed < gatherDuration + hoverDuration) {
    return hoverPose(elapsed - gatherDuration);
  }

  if (animationPhase !== 'stacked') {
    const flyT = Math.min((elapsed - gatherDuration - hoverDuration) / flyDuration, 1);
    // The flight leaves from the hover pose as it keeps moving, not a frozen copy of it: the eased
    // flight starts with zero speed of its own, so the card carries the hover's motion into the
    // flight instead of turning sharply on take-off (and still lands exactly on the target).
    return calcFlyPhase({ t: flyT, launchPose: hoverPose(elapsed - gatherDuration), centerPos, targetPos: targetPosition, stackedY, landingYaw, targetScale, offsets: randomOffsets, variant: animationVariant, profile: animationProfile, stackIndex });
  }

  return calcStackedPhase(targetPosition, stackedY, landingYaw, targetScale);
}
