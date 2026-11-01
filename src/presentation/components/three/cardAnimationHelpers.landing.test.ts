import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PLAY_ANIMATION, TABLE_SURFACE } from '../../config/physics.config';
import {
  calculateCardAnimationProgress,
  calculateCardPosition,
  calculateCardRotation,
} from './cardAnimationHelpers';
import { ZERO_ANIMATION_OFFSETS } from './physics-played-card.fixtures';
import type { CardAnimationOffsets } from './physics-played-card.types';

describe('landing touchdown', () => {
  const throwOffsets: CardAnimationOffsets = { ...ZERO_ANIMATION_OFFSETS, throwStrength: 1.2, bounceStrength: 0.15 };
  const cases = [
    {
      name: 'local command throw',
      isLocalPlayer: true,
      effectiveStartPosition: [0, 0.3, 2.47] as [number, number, number],
      dropInfo: undefined,
    },
    {
      name: 'opponent throw',
      isLocalPlayer: false,
      effectiveStartPosition: [-2.47, 0.3, 0] as [number, number, number],
      dropInfo: undefined,
    },
    {
      name: 'drag throw',
      isLocalPlayer: true,
      effectiveStartPosition: [0.5, 0.35, 1.6] as [number, number, number],
      dropInfo: {
        dropPosition: new THREE.Vector3(0.4, TABLE_SURFACE.CARD_REST_Y, 0.9),
        startPosition: new THREE.Vector3(0.5, 0.35, 1.6),
        velocity: new THREE.Vector3(0, 0, -4),
        isSlowDrop: false,
      },
    },
  ];

  function positionAt(rawProgress: number, testCase: typeof cases[number]) {
    return calculateCardPosition({
      rawProgress,
      posProgress: calculateCardAnimationProgress(rawProgress),
      effectiveStartPosition: testCase.effectiveStartPosition,
      effectiveTargetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0.97],
      randomOffsets: throwOffsets,
      playOrder: 0,
      totalCards: 1,
      cardScale: 0.9,
      dropInfo: testCase.dropInfo,
      isLocalPlayer: testCase.isLocalPlayer,
    });
  }

  it.each(cases)('rests on the felt when the landing impact fires ($name)', (testCase) => {
    const touchdown = positionAt(PLAY_ANIMATION.BOUNCE_START, testCase);
    const rest = positionAt(1, testCase);

    expect(Math.abs(touchdown.y - rest.y)).toBeLessThan(0.01);
    expect(touchdown.x).toBeCloseTo(rest.x);
    expect(touchdown.z).toBeCloseTo(rest.z);
  });

  it.each(cases)('is still descending just before touchdown and bounces after it ($name)', (testCase) => {
    const rest = positionAt(1, testCase);
    const beforeTouchdown = positionAt(PLAY_ANIMATION.BOUNCE_START - 0.05, testCase);
    const afterTouchdown = positionAt(PLAY_ANIMATION.BOUNCE_START + 0.02, testCase);

    expect(beforeTouchdown.y).toBeGreaterThan(rest.y + 0.01);
    expect(afterTouchdown.y).toBeGreaterThan(rest.y);
  });

  it('levels the descent tilt by touchdown instead of snapping it away on impact', () => {
    const rotationAt = (rawProgress: number) => calculateCardRotation({
      rawProgress,
      posProgress: calculateCardAnimationProgress(rawProgress),
      elapsedTime: 0,
      isLocalPlayer: false,
      targetRotation: [-Math.PI / 2, 0, 0],
      randomOffsets: { ...ZERO_ANIMATION_OFFSETS, throwStrength: 1.2 },
    });
    const before = rotationAt(PLAY_ANIMATION.BOUNCE_START - 0.001);
    const after = rotationAt(PLAY_ANIMATION.BOUNCE_START + 0.001);

    // Only the bounce's own impact wobble (BOUNCE_INTENSITY / 2) may start here
    expect(Math.abs(after.x - before.x)).toBeLessThan(PLAY_ANIMATION.BOUNCE_INTENSITY);
  });
});

describe('local release spin', () => {
  const spinOffsets: CardAnimationOffsets = {
    ...ZERO_ANIMATION_OFFSETS,
    flightSpinZ: Math.PI * 0.74,
    finalRotZ: 0.2,
    throwStrength: 1.2,
  };
  const rotationAt = (rawProgress: number, isLocalPlayer: boolean, offsets = spinOffsets) => calculateCardRotation({
    rawProgress,
    posProgress: calculateCardAnimationProgress(rawProgress),
    elapsedTime: 0,
    isLocalPlayer,
    targetRotation: [-Math.PI / 2, 0, 0],
    randomOffsets: offsets,
  });
  const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

  it.each([Math.PI * 0.74, -Math.PI * 0.74, Math.PI * 0.3, -Math.PI * 0.1])(
    'starts in the held in-plane angle for flight spin %f',
    (flightSpinZ) => {
      const rotation = rotationAt(0, true, { ...spinOffsets, flightSpinZ });
      expect(wrapAngle(rotation.z)).toBeCloseTo(0);
    }
  );

  it('turns monotonically and settles on the landing angle', () => {
    let previous = rotationAt(0, true).z;
    for (let step = 1; step <= 20; step++) {
      const current = rotationAt(step / 20, true).z;
      expect(current).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = current;
    }
    expect(rotationAt(1, true).z).toBeCloseTo(spinOffsets.finalRotZ);
  });

  it('keeps the seeded wind-down spin for remote throws', () => {
    const rotation = rotationAt(0, false);
    expect(rotation.z).toBeCloseTo(
      spinOffsets.finalRotZ + spinOffsets.flightSpinZ * PLAY_ANIMATION.FLIGHT_SPIN_SPEED
    );
  });
});
