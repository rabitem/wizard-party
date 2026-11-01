import { describe, expect, it } from 'vitest';
import {
  COLLECTION_ANIMATION_VARIANTS,
  type CollectionAnimationVariant,
} from '../../config/collection-animation.config';
import { CARD_DIMENSIONS, COLLECT_ANIMATION } from '../../config/physics.config';
import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import {
  COLLECTING_CARD_HOVER_SCALE,
  getCollectingAnimationProfile,
  getCollectingFlyDelay,
  getCollectingFlyDuration,
  getCollectingModeTiming,
  getCollectingWaitDuration,
  getInitialCollectingCardTransform,
  shortestAngleDelta,
} from './collecting-card-animation';
import {
  resolveFrameAnimationResult,
  type AnimationResult,
  type FrameAnimationParams,
  type PhaseOffsets,
} from './collecting-card-frame-animation';

const FRAME_S = 1 / 60;
const OFFSETS: PhaseOffsets = {
  gatherArcMultiplier: 1.1,
  flySpinZ: 0.14,
  gatherWobbleX: 0.03,
  gatherWobbleZ: -0.025,
  flyArcMultiplier: 1.05,
  durationMult: 1.04,
  seedAngle: 2.3,
};

interface TimelineCase {
  variant: CollectionAnimationVariant;
  stackIndex: number;
  collectingCardCount: number;
  startRotation: number;
  targetRotation: number;
  /** The winner's deck; defaults to a far seat */
  targetPosition?: [number, number, number];
}

const START_POSITION: [number, number, number] = [1.4, 0.03, 1.1];
const CENTER_POSITION: [number, number, number] = [0.015, 0.3, -0.012];
const TARGET_POSITION: [number, number, number] = [-2.1, 0.05, 1.6];

function distanceBetween(from: [number, number, number], to: [number, number, number]): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

/** Distance-aware gather duration, as PhysicsCollectingCard paces a real collection */
function pacedGatherDuration(): number {
  const paced = distanceBetween(START_POSITION, CENTER_POSITION) / COLLECT_ANIMATION.GATHER_SPEED;
  return Math.min(COLLECT_ANIMATION.GATHER_DURATION_MAX, Math.max(COLLECT_ANIMATION.GATHER_DURATION_MIN, paced)) * OFFSETS.durationMult;
}

function buildParams({ variant, stackIndex, collectingCardCount, startRotation, targetRotation, targetPosition = TARGET_POSITION }: TimelineCase): Omit<FrameAnimationParams, 'elapsed'> {
  const timing = getCollectingModeTiming(variant);
  const profile = getCollectingAnimationProfile(variant);
  return {
    gatherDuration: pacedGatherDuration() * timing.flyDurationMultiplier,
    waitDuration: getCollectingWaitDuration(timing),
    flyDelay: getCollectingFlyDelay(stackIndex, timing),
    flyDuration: getCollectingFlyDuration(distanceBetween(CENTER_POSITION, targetPosition), OFFSETS.durationMult, profile),
    animationPhase: 'flying',
    startPosition: START_POSITION,
    centerPos: CENTER_POSITION,
    targetPosition,
    stackedY: 0.05,
    startRotation,
    targetRotation,
    targetScale: 0.65,
    randomOffsets: OFFSETS,
    animationVariant: variant,
    animationProfile: getCollectingAnimationProfile(variant),
    stackIndex,
    collectingCardCount,
  };
}

function buildTrick(variant: CollectionAnimationVariant, collectingCardCount: number): Omit<FrameAnimationParams, 'elapsed'>[] {
  return Array.from({ length: collectingCardCount }, (_, stackIndex) =>
    buildParams({ variant, stackIndex, collectingCardCount, startRotation: -1, targetRotation: -2 })
  );
}

/** Smallest drop from one stack slot to the next (negative when a later slot sits higher) */
function getSmallestGap(heights: number[]): number {
  return Math.min(...heights.slice(1).map((height, index) => heights[index] - height));
}

function poseAt(params: Omit<FrameAnimationParams, 'elapsed'>, elapsed: number): AnimationResult {
  return resolveFrameAnimationResult({ ...params, elapsed });
}

function poseJump(a: AnimationResult, b: AnimationResult): number {
  return Math.max(
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
    Math.abs(a.scale - b.scale),
    Math.abs(shortestAngleDelta(a.rotY, b.rotY)),
    Math.abs(shortestAngleDelta(a.rotZ, b.rotZ))
  );
}

function getPhaseBoundaries(params: Omit<FrameAnimationParams, 'elapsed'>): number[] {
  const flyStart = params.gatherDuration + params.waitDuration + params.flyDelay;
  return [params.gatherDuration, flyStart, flyStart + params.flyDuration];
}

/** Largest second difference of the flight path per 60 Hz frame, as the sandbox audit judges a scripted card */
function getSharpestFlightBend(params: Omit<FrameAnimationParams, 'elapsed'>): number {
  const [, flyStart, flyEnd] = getPhaseBoundaries(params);
  const points: number[][] = [];
  for (let elapsed = flyStart - 2 * FRAME_S; elapsed <= flyEnd; elapsed += FRAME_S) {
    const pose = poseAt(params, elapsed);
    points.push([pose.x, pose.y, pose.z]);
  }

  let sharpest = 0;
  for (let index = 2; index < points.length; index++) {
    const [a, b, c] = [points[index - 2], points[index - 1], points[index]];
    sharpest = Math.max(sharpest, Math.hypot(c[0] - 2 * b[0] + a[0], c[1] - 2 * b[1] + a[1], c[2] - 2 * b[2] + a[2]));
  }
  return sharpest;
}

// Decks next to the centre pace the shortest flights, where a flourish bends hardest per frame
const NEAR_DECKS: [number, number, number][] = [[1, 0.05, 0.6], [-0.9, 0.05, -0.7], [0.2, 0.05, -1.1], [-1.1, 0.05, 0.3]];
const SHORT_HOPS: TimelineCase[] = COLLECTION_ANIMATION_VARIANTS.flatMap((variant) =>
  [0, 1, 2, 3, 4, 5].map((stackIndex) => ({ variant, stackIndex, collectingCardCount: 6, startRotation: -1, targetRotation: -2 }))
);

const CASES: TimelineCase[] = COLLECTION_ANIMATION_VARIANTS.flatMap((variant) =>
  [0, 2, 5].map((stackIndex) => ({
    variant,
    stackIndex,
    collectingCardCount: 6,
    startRotation: -(5 * Math.PI) / 3,
    targetRotation: -0.05,
  }))
);

describe('resolveFrameAnimationResult', () => {
  describe('phase continuity', () => {
    it('mounts the collecting card on its first animated frame', () => {
      const params = buildParams(CASES[0]);
      const pose = poseAt(params, 0);
      const mounted = getInitialCollectingCardTransform({
        startPosition: params.startPosition,
        startRotation: params.startRotation,
      });

      expect(mounted.position).toEqual([pose.x, pose.y, pose.z]);
      expect(mounted.rotation[1]).toBeCloseTo(pose.rotY, 9);
      expect(mounted.rotation[2]).toBeCloseTo(pose.rotZ, 9);
      expect(mounted.scale).toBeCloseTo(pose.scale, 9);
    });

    it.each(CASES)('does not pop at any phase boundary ($variant, stack slot $stackIndex)', (timelineCase) => {
      const params = buildParams(timelineCase);
      const epsilon = 1e-7;

      for (const boundary of getPhaseBoundaries(params)) {
        const before = poseAt(params, boundary - epsilon);
        const after = poseAt({ ...params, animationPhase: before.isComplete ? 'stacked' : params.animationPhase }, boundary + epsilon);
        expect(poseJump(before, after)).toBeLessThan(1e-3);
      }
    });

    it.each(CASES)('keeps the flight arc rounded at 60 Hz, with no sharp apex ($variant, stack slot $stackIndex)', (timelineCase) => {
      const params = buildParams(timelineCase);
      const [, flyStart, flyEnd] = getPhaseBoundaries(params);
      const heights: number[] = [];
      for (let elapsed = flyStart; elapsed <= flyEnd; elapsed += FRAME_S) heights.push(poseAt(params, elapsed).y);

      // Second difference of height per frame: smooth arcs stay well below what reads as a bounce.
      const sharpest = Math.max(...heights.slice(2).map((height, index) => Math.abs(height - 2 * heights[index + 1] + heights[index])));
      expect(sharpest).toBeLessThan(0.1);
    });

    it.each(CASES)('carries the hover motion into the flight, with no turn on take-off ($variant, stack slot $stackIndex)', (timelineCase) => {
      const params = buildParams(timelineCase);
      const [, flyStart] = getPhaseBoundaries(params);
      const at = (elapsed: number) => {
        const pose = poseAt(params, elapsed);
        return [pose.x, pose.y, pose.z];
      };
      const velocity = (from: number[], to: number[]) => to.map((value, index) => (value - from[index]) / FRAME_S);
      const before = velocity(at(flyStart - 2 * FRAME_S), at(flyStart - FRAME_S));
      const after = velocity(at(flyStart), at(flyStart + FRAME_S));
      const change = Math.hypot(...after.map((value, index) => value - before[index]));
      // Units per second: a frozen launch pose left orbiting spiral cards turning by ~1.8 u/s here.
      expect(change).toBeLessThan(1.5);
    });

    it.each(SHORT_HOPS)('sweeps a short hop to a near deck without a path kink ($variant, stack slot $stackIndex)', (timelineCase) => {
      for (const targetPosition of NEAR_DECKS) {
        expect(getSharpestFlightBend(buildParams({ ...timelineCase, targetPosition }))).toBeLessThan(SANDBOX_AUDIT.MAX_PATH_KINK);
      }
    });

    it('lands from the flight exactly on the stacked pose', () => {
      const params = buildParams(CASES[4]);
      const [, , flyEnd] = getPhaseBoundaries(params);
      const landed = poseAt(params, flyEnd + 1);
      const stacked = poseAt({ ...params, animationPhase: 'stacked' }, flyEnd + 1);

      expect(landed.isComplete).toBe(true);
      expect(poseJump(landed, stacked)).toBeLessThan(1e-9);
    });

    it.each(CASES)('keeps every 60 Hz step below teleport size ($variant, stack slot $stackIndex)', (timelineCase) => {
      const params = buildParams(timelineCase);
      const [, , flyEnd] = getPhaseBoundaries(params);
      let previous = poseAt(params, 0);
      let maxStep = 0;

      for (let elapsed = FRAME_S; elapsed <= flyEnd + FRAME_S; elapsed += FRAME_S) {
        const pose = poseAt(params, elapsed);
        maxStep = Math.max(maxStep, Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z));
        previous = pose;
      }

      // 30 u/s at 60 Hz is where a scripted card reads as a teleport
      expect(maxStep).toBeLessThan(0.5);
    });

    it('starts the gather from the played card pose and lands it on the hover pose at rest', () => {
      const params = buildParams({ variant: 'spiral', stackIndex: 1, collectingCardCount: 4, startRotation: -1.2, targetRotation: -3 });
      const start = poseAt(params, 0);

      expect([start.x, start.y, start.z]).toEqual(params.startPosition);
      expect(start.rotY).toBeCloseTo(-1.2, 9);
      expect(start.rotZ).toBeCloseTo(0, 9);
      expect(start.scale).toBeCloseTo(0.9, 9);

      const lastGather = poseAt(params, params.gatherDuration - FRAME_S);
      const arrival = poseAt(params, params.gatherDuration - 1e-7);
      // Converging, not slamming into the hover: the last gather frame moves far less than a unit per second
      expect(Math.hypot(arrival.x - lastGather.x, arrival.y - lastGather.y, arrival.z - lastGather.z)).toBeLessThan(0.02);
      expect(arrival.scale).toBeCloseTo(COLLECTING_CARD_HOVER_SCALE, 3);
    });
  });

  describe('flight yaw', () => {
    it('turns the short way round between seat rotations in (-2PI, 0]', () => {
      const params = buildParams({ variant: 'classic', stackIndex: 0, collectingCardCount: 6, startRotation: -(5 * Math.PI) / 3, targetRotation: 0 });
      const [, flyStart, flyEnd] = getPhaseBoundaries(params);
      const launchYaw = poseAt(params, flyStart).rotY;
      let travelled = 0;
      let previousYaw = launchYaw;

      for (let elapsed = flyStart + FRAME_S; elapsed <= flyEnd; elapsed += FRAME_S) {
        const yaw = poseAt(params, elapsed).rotY;
        travelled += Math.abs(yaw - previousYaw);
        previousYaw = yaw;
      }

      // Shortest turn is +60 degrees; the old lerp spun -300 degrees
      expect(Math.abs(shortestAngleDelta(launchYaw, 0))).toBeLessThan(Math.PI / 3 + 0.2);
      expect(travelled).toBeLessThan(Math.PI / 2);
      expect(Math.abs(shortestAngleDelta(poseAt(params, flyEnd).rotY, 0))).toBeLessThan(1e-9);
    });

    it('keeps one turn direction when the winner sits almost opposite the hover yaw', () => {
      // The hover yaw bobs around its start rotation, so it crosses the half-turn to the target
      // during the flight; a direction chosen per frame flipped there (a pop of 2PI times the progress).
      const params = buildParams({ variant: 'classic', stackIndex: 1, collectingCardCount: 4, startRotation: -0.1, targetRotation: -0.1 - Math.PI });
      const [, flyStart, flyEnd] = getPhaseBoundaries(params);
      let previousYaw = poseAt(params, flyStart).rotY;
      // The fastest honest frame: the half turn at the cubic ease-in-out's peak speed (3x the mean,
      // at t = 0.5), plus the wobble. A flipped direction jumps 2PI times the progress, far above it.
      const turn = Math.abs(shortestAngleDelta(previousYaw, params.targetRotation));
      const maxStep = (3 * turn * FRAME_S) / (flyEnd - flyStart) + 0.05;

      for (let elapsed = flyStart + FRAME_S; elapsed <= flyEnd; elapsed += FRAME_S) {
        const yaw = poseAt(params, elapsed).rotY;
        expect(Math.abs(yaw - previousYaw)).toBeLessThan(maxStep);
        previousYaw = yaw;
      }
      expect(Math.abs(shortestAngleDelta(poseAt(params, flyEnd).rotY, params.targetRotation))).toBeLessThan(1e-6);
    });
  });

});

describe('collecting card hover formation', () => {
  it.each(['classic', 'comet'] as CollectionAnimationVariant[])('keeps the %s pile apart for the whole hover', (variant) => {
    const cards = buildTrick(variant, 6);
    const hoverStart = cards[0].gatherDuration;
    const firstTakeOff = hoverStart + cards[0].waitDuration;
    const scaledThickness = CARD_DIMENSIONS.THICKNESS * COLLECTING_CARD_HOVER_SCALE;

    for (let elapsed = hoverStart; elapsed < firstTakeOff; elapsed += FRAME_S / 4) {
      const heights = cards.map((params) => poseAt(params, elapsed).y);
      // The first card to fly sits on top, each card a full card thickness above the next
      expect(getSmallestGap(heights)).toBeGreaterThan(scaledThickness);
    }
    expect(COLLECT_ANIMATION.HOVER_STACK_SPACING).toBeGreaterThan(scaledThickness);
  });

  it.each([3, 4, 5, 6])('centres the blade dance fan and keeps it in front for %i cards', (collectingCardCount) => {
    const hoverOffsets = buildTrick('bladeDance', collectingCardCount).map((params) => {
      const pose = poseAt(params, params.gatherDuration);
      return { x: pose.x - params.centerPos[0], z: pose.z - params.centerPos[2] };
    });
    const hoverXs = hoverOffsets.map(({ x }) => x);

    expect(Math.min(...hoverOffsets.map(({ z }) => z))).toBeGreaterThan(0);
    expect(Math.abs(Math.min(...hoverXs) + Math.max(...hoverXs))).toBeLessThan(0.1);
  });
});
