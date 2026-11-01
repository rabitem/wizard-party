import {
  COLLECT_ANIMATION,
  getCardRestY,
  seededRandom,
} from '../../config/physics.config';
import {
  COLLECTION_ANIMATION_PROFILES,
  COLLECTION_ANIMATION_VARIANTS,
  COLLECTION_PATH_SHAPE,
  type CollectionAnimationMode,
  type CollectionAnimationProfile,
  type CollectionAnimationVariant,
} from '../../config/collection-animation.config';
import { STACKED_DECK_LAYOUT } from './stacked-deck-layout';

export const COLLECTING_CARD_START_SCALE = 0.9;
export const COLLECTING_CARD_HOVER_SCALE = COLLECT_ANIMATION.HOVER_SCALE;
export const COLLECTING_CARD_END_SCALE = STACKED_DECK_LAYOUT.DECK_SCALE;

/** Trick-level pacing multipliers: shared by every card of one collection. */
export interface CollectingModeTiming {
  staggerMultiplier: number;
  waitDurationMultiplier: number;
  flyDurationMultiplier: number;
}

interface InitialCollectingCardTransformParams {
  startPosition: [number, number, number];
  startRotation: number;
}

interface ResolveCollectingAnimationVariantParams {
  mode: CollectionAnimationMode;
  cardId: string;
  stackIndex: number;
}

interface CollectingFlightPathOffsetParams {
  variant: CollectionAnimationVariant;
  t: number;
  centerPosition: [number, number, number];
  targetPosition: [number, number, number];
  stackIndex: number;
  seedAngle: number;
}

export function getInitialCollectingCardTransform({
  startPosition,
  startRotation,
}: InitialCollectingCardTransformParams): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
} {
  return {
    position: startPosition,
    rotation: [-Math.PI / 2, startRotation, 0],
    scale: COLLECTING_CARD_START_SCALE,
  };
}

export function getCollectingCardStackedY(
  targetPosition: [number, number, number],
  targetScale: number = COLLECTING_CARD_END_SCALE
): number {
  return Math.max(targetPosition[1], getCardRestY(targetScale));
}

export function getCollectingAnimationProfile(
  variant: CollectionAnimationVariant
): CollectionAnimationProfile {
  return COLLECTION_ANIMATION_PROFILES[variant];
}

export function resolveCollectingAnimationVariant({
  mode,
  cardId,
  stackIndex,
}: ResolveCollectingAnimationVariantParams): CollectionAnimationVariant {
  if (mode !== 'random') return mode;

  const rand = seededRandom(`${cardId}:${stackIndex}:collection-style`);
  const index = Math.floor(rand() * COLLECTION_ANIMATION_VARIANTS.length) %
    COLLECTION_ANIMATION_VARIANTS.length;

  return COLLECTION_ANIMATION_VARIANTS[index];
}

/**
 * Pacing of a whole collection. A fixed mode uses its profile; 'random' mixes variants per card,
 * so it uses the slowest multipliers of all variants. Every flight slot is then long enough for
 * any variant's flight, and higher stack slots never land before lower ones.
 */
export function getCollectingModeTiming(mode: CollectionAnimationMode): CollectingModeTiming {
  const profiles = mode === 'random'
    ? COLLECTION_ANIMATION_VARIANTS.map((variant) => COLLECTION_ANIMATION_PROFILES[variant])
    : [COLLECTION_ANIMATION_PROFILES[mode]];

  return {
    staggerMultiplier: Math.max(...profiles.map((profile) => profile.staggerMultiplier)),
    waitDurationMultiplier: Math.max(...profiles.map((profile) => profile.waitDurationMultiplier)),
    flyDurationMultiplier: Math.max(...profiles.map((profile) => profile.flyDurationMultiplier)),
  };
}

/** Delay before a stack slot takes off: one slot covers the longest possible flight plus a gap. */
export function getCollectingFlyDelay(stackIndex: number, timing: CollectingModeTiming): number {
  const longestFlight = COLLECT_ANIMATION.FLY_DURATION_MAX *
    (1 + COLLECT_ANIMATION.DURATION_JITTER) *
    timing.flyDurationMultiplier;

  return stackIndex * (longestFlight + COLLECT_ANIMATION.FLY_STAGGER) * timing.staggerMultiplier;
}

export function getCollectingWaitDuration(timing: CollectingModeTiming): number {
  return COLLECT_ANIMATION.WAIT_DURATION * timing.waitDurationMultiplier;
}

/** Signed shortest turn from one yaw to another, in (-PI, PI]. */
export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function smoothstep(value: number, edge0: number, edge1: number): number {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

/**
 * Bell envelope for flight-path flourishes: 1 at mid-flight, and zero with zero slope at take-off
 * and landing, so the offsets leave the hover and reach the deck without a velocity kick.
 */
function flightEnvelope(t: number): number {
  const bell = 4 * t * (1 - t);
  return bell * bell;
}

function getHorizontalPerpendicular(
  centerPosition: [number, number, number],
  targetPosition: [number, number, number]
): [number, number] {
  const dx = targetPosition[0] - centerPosition[0];
  const dz = targetPosition[2] - centerPosition[2];
  const length = Math.hypot(dx, dz);

  if (length < 0.0001) return [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)];

  return [-dz / length, dx / length];
}

export function getCollectingFlightPathOffset({
  variant,
  t,
  centerPosition,
  targetPosition,
  stackIndex,
  seedAngle,
}: CollectingFlightPathOffsetParams): [number, number, number] {
  const clampedT = Math.min(1, Math.max(0, t));
  if (clampedT === 0 || clampedT === 1 || variant === 'classic') return [0, 0, 0];

  const profile = getCollectingAnimationProfile(variant);
  const fade = flightEnvelope(clampedT);
  const [perpX, perpZ] = getHorizontalPerpendicular(centerPosition, targetPosition);
  const stackPhase = stackIndex * 0.37;

  if (variant === 'bladeDance') {
    const slash = Math.sin((clampedT * 3.4 + stackPhase) * Math.PI);
    const side = stackIndex % 2 === 0 ? 1 : -1;
    // Sweep from one side of the straight path to the other; a hard sign flip teleports the card
    const cut = smoothstep(
      clampedT,
      COLLECTION_PATH_SHAPE.BLADE_DANCE_CUT_START,
      COLLECTION_PATH_SHAPE.BLADE_DANCE_CUT_END
    ) * 2 - 1;
    const amplitude = profile.pathAmplitude;

    return [
      perpX * fade * side * cut * (0.22 + 0.035 * stackIndex) * amplitude + Math.cos(seedAngle) * fade * 0.04,
      Math.sin(clampedT * Math.PI * 2) * 0.045 * fade,
      perpZ * fade * side * cut * (0.22 + 0.035 * stackIndex) * amplitude + Math.sin(seedAngle) * fade * 0.04 + slash * fade * 0.08 * amplitude,
    ];
  }

  if (variant === 'spiral') {
    const radiusSlots = Math.min(stackIndex, COLLECTION_PATH_SHAPE.SPIRAL_RADIUS_GROWTH_SLOTS);
    const radius = fade * (0.17 + 0.03 * radiusSlots) * profile.pathAmplitude;
    const angle = seedAngle + clampedT * Math.PI * 2 * COLLECTION_PATH_SHAPE.SPIRAL_ORBIT_TURNS + stackPhase;

    return [
      Math.cos(angle) * radius,
      Math.sin(clampedT * Math.PI * 4) * 0.06 * fade + fade * 0.065,
      Math.sin(angle) * radius,
    ];
  }

  const push = fade * (0.07 + 0.012 * stackIndex) * profile.pathAmplitude;

  return [
    perpX * push + Math.cos(seedAngle) * fade * 0.02,
    fade * 0.24,
    perpZ * push + Math.sin(seedAngle) * fade * 0.02,
  ];
}
