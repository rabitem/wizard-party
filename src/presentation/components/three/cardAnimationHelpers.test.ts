import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TRUMP_ZONE_PHYSICS } from '../../config/rapier.config';
import { CARD_DIMENSIONS, PLAY_ANIMATION, TABLE_SURFACE } from '../../config/physics.config';
import {
  calculateCardAnimationProgress,
  calculateCardAnimationDuration,
  calculateCardPosition,
  calculateCardRotation,
  isCardAnimationComplete,
} from './cardAnimationHelpers';
import { ZERO_ANIMATION_OFFSETS } from './physics-played-card.fixtures';
import type { CardAnimationOffsets } from './physics-played-card.types';

function getLowestCardPointY(
  centerY: number,
  rotation: { x: number; y: number; z: number },
  scale: number
): number {
  const halfSizes = {
    x: (CARD_DIMENSIONS.WIDTH * scale) / 2,
    y: (CARD_DIMENSIONS.HEIGHT * scale) / 2,
    z: (CARD_DIMENSIONS.THICKNESS * scale) / 2,
  };
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotation.x, rotation.y, rotation.z, 'YXZ')
  );
  const elements = matrix.elements;
  const verticalHalfExtent =
    Math.abs(elements[1]) * halfSizes.x +
    Math.abs(elements[5]) * halfSizes.y +
    Math.abs(elements[9]) * halfSizes.z;

  return centerY - verticalHalfExtent;
}

describe('calculateCardPosition', () => {
  it('keeps a slow drop exactly at table center outside the trump hard radius', () => {
    const position = calculateCardPosition({
      rawProgress: 1,
      posProgress: 1,
      effectiveStartPosition: [1, TABLE_SURFACE.CARD_REST_Y, 0],
      effectiveTargetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      playOrder: 0,
      totalCards: 1,
      dropInfo: {
        dropPosition: new THREE.Vector3(0, TABLE_SURFACE.CARD_REST_Y, 0),
        startPosition: new THREE.Vector3(1, TABLE_SURFACE.CARD_REST_Y, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        isSlowDrop: true,
      },
      isLocalPlayer: true,
    });

    expect(Math.hypot(position.x, position.z)).toBeGreaterThanOrEqual(
      TRUMP_ZONE_PHYSICS.HARD_RADIUS
    );
    expect(position.x).toBeGreaterThan(0);
    expect(position.z).toBe(0);
  });

  it('pushes a centre-targeted card back along its approach until its whole footprint clears the trump', () => {
    const scale = 0.9;
    const position = calculateCardPosition({
      rawProgress: 1,
      posProgress: 1,
      effectiveStartPosition: [-1, TABLE_SURFACE.CARD_REST_Y, -1],
      effectiveTargetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      playOrder: 0,
      totalCards: 1,
      cardScale: scale,
      isLocalPlayer: true,
    });

    const halfDiagonal = Math.hypot(
      CARD_DIMENSIONS.WIDTH * scale,
      CARD_DIMENSIONS.HEIGHT * scale
    ) / 2;

    expect(Math.hypot(position.x, position.z)).toBeGreaterThanOrEqual(
      TRUMP_ZONE_PHYSICS.HARD_RADIUS + halfDiagonal
    );
    expect(position.x).toBeLessThan(0);
    expect(position.z).toBeLessThan(0);
  });

  it('starts local drop animations from the release point instead of the seat slot', () => {
    const releasePosition = new THREE.Vector3(1.2, 0.35, -0.4);
    const position = calculateCardPosition({
      rawProgress: 0,
      posProgress: 0,
      effectiveStartPosition: [-2, 0.3, 0],
      effectiveTargetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      playOrder: 0,
      totalCards: 1,
      dropInfo: {
        dropPosition: new THREE.Vector3(1.2, TABLE_SURFACE.CARD_REST_Y, -0.4),
        startPosition: releasePosition,
        velocity: new THREE.Vector3(0, 0, 0),
        isSlowDrop: true,
      },
      isLocalPlayer: true,
    });

    expect(position.x).toBeCloseTo(releasePosition.x);
    expect(position.y).toBeCloseTo(releasePosition.y);
    expect(position.z).toBeCloseTo(releasePosition.z);
  });

  it('makes slow drops fall toward the table without rising into a throw arc', () => {
    const startY = 0.35;
    const position = calculateCardPosition({
      rawProgress: 0.4,
      posProgress: 0.784,
      effectiveStartPosition: [1, startY, 0],
      effectiveTargetPosition: [1, TABLE_SURFACE.CARD_REST_Y, 0],
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      playOrder: 0,
      totalCards: 1,
      dropInfo: {
        dropPosition: new THREE.Vector3(1, TABLE_SURFACE.CARD_REST_Y, 0),
        startPosition: new THREE.Vector3(1, startY, 0),
        velocity: new THREE.Vector3(0.1, 0, 0.1),
        isSlowDrop: true,
      },
      isLocalPlayer: true,
    });

    expect(position.y).toBeLessThan(startY);
    expect(position.y).toBeGreaterThanOrEqual(TABLE_SURFACE.CARD_REST_Y);
  });

  it('treats synchronized low-velocity remote plays as drops instead of throw arcs', () => {
    const startY = 0.35;
    const position = calculateCardPosition({
      rawProgress: 0.4,
      posProgress: calculateCardAnimationProgress(0.4, true),
      effectiveStartPosition: [1, startY, 0],
      effectiveTargetPosition: [1, TABLE_SURFACE.CARD_REST_Y, 0],
      randomOffsets: { ...ZERO_ANIMATION_OFFSETS, throwStrength: 1.2 },
      playOrder: 0,
      totalCards: 1,
      physicsState: {
        startPosition: { x: 1, y: startY, z: 0 },
        landingPosition: { x: 1, y: TABLE_SURFACE.CARD_REST_Y, z: 0 },
        throwVelocity: { x: 0.1, y: 0, z: 0.1 },
        physicsSeed: 123,
      },
      isLocalPlayer: false,
    });

    expect(position.y).toBeLessThan(startY);
    expect(position.y).toBeGreaterThanOrEqual(TABLE_SURFACE.CARD_REST_Y);
  });

  const tiltedOffsets: CardAnimationOffsets = { ...ZERO_ANIMATION_OFFSETS, finalRotX: 0.04, finalRotZ: 0.2 };

  // A resting card lies on the felt: its lowest corner sits TABLE_SURFACE.EPSILON above FELT_Y
  // (no z-fighting, no thickness or tilted corner inside the table) and no higher (no floating)
  it.each([
    { name: 'scaled flat', cardScale: 1.4, offsets: ZERO_ANIMATION_OFFSETS, targetY: TABLE_SURFACE.FELT_Y },
    { name: 'tilted', cardScale: 0.9, offsets: tiltedOffsets, targetY: TABLE_SURFACE.CARD_REST_Y },
  ])('rests on the felt without sinking in or floating ($name)', ({ cardScale, offsets, targetY }) => {
    const position = calculateCardPosition({
      rawProgress: 1,
      posProgress: 1,
      effectiveStartPosition: [1, 0.35, 0],
      effectiveTargetPosition: [1, targetY, 0],
      randomOffsets: offsets,
      playOrder: 0,
      totalCards: 1,
      cardScale,
      isLocalPlayer: true,
    });
    const rotation = calculateCardRotation({
      rawProgress: 1,
      posProgress: 1,
      elapsedTime: 1,
      isLocalPlayer: true,
      targetRotation: [-Math.PI / 2, 0, 0],
      randomOffsets: offsets,
    });

    const lowestY = getLowestCardPointY(position.y, rotation, cardScale);
    const touchdownY = TABLE_SURFACE.FELT_Y + TABLE_SURFACE.EPSILON;

    expect(lowestY).toBeGreaterThanOrEqual(touchdownY - 1e-9);
    expect(lowestY).toBeLessThanOrEqual(touchdownY + 1e-6);
  });
});

describe('calculateCardRotation', () => {
  it('removes flight spin and tumble from slow drops', () => {
    const rotation = calculateCardRotation({
      rawProgress: 0.45,
      posProgress: calculateCardAnimationProgress(0.45, true),
      elapsedTime: 1,
      isLocalPlayer: true,
      targetRotation: [-Math.PI / 2, 0.25, 0],
      randomOffsets: {
        ...ZERO_ANIMATION_OFFSETS,
        flightSpinZ: 1,
        flightWobbleX: 1,
        flightWobbleZ: 1,
        throwStrength: 1.2,
      },
      isSlowDrop: true,
    });

    expect(rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(rotation.y).toBeCloseTo(0.25 * calculateCardAnimationProgress(0.45, true));
    expect(rotation.z).toBeCloseTo(0);
  });
});

describe('played-card motion profile', () => {
  it('does not move thrown cards most of the way across the table halfway through the flight', () => {
    expect(calculateCardAnimationProgress(PLAY_ANIMATION.BOUNCE_START / 2, false)).toBeLessThanOrEqual(0.65);
  });

  it('finishes horizontal travel at touchdown so the landing bounce happens in place', () => {
    expect(calculateCardAnimationProgress(PLAY_ANIMATION.BOUNCE_START, false)).toBeCloseTo(1);
    expect(calculateCardAnimationProgress(PLAY_ANIMATION.BOUNCE_START, true)).toBeCloseTo(1);
  });

  it('does not slide slow drops sideways before the fall has caught up', () => {
    expect(calculateCardAnimationProgress(0.5, true)).toBeLessThanOrEqual(0.65);
  });

  it('extends long throws beyond the old sub-half-second local duration', () => {
    const duration = calculateCardAnimationDuration({
      isLocalPlayer: true,
      effectiveStartPosition: [2.4, 0.35, 0],
      effectiveTargetPosition: [-1.1, TABLE_SURFACE.CARD_REST_Y, 0],
      durationMultiplier: 1,
    });

    expect(duration).toBeGreaterThanOrEqual(PLAY_ANIMATION.MIN_DURATION);
    expect(duration).toBeGreaterThan(0.5);
  });
});

describe('isCardAnimationComplete', () => {
  it('waits until the scripted flight and landing bounce have settled', () => {
    expect(isCardAnimationComplete(0.75)).toBe(false);
    expect(isCardAnimationComplete(0.999)).toBe(false);
    expect(isCardAnimationComplete(1)).toBe(true);
  });
});
