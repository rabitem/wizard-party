import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PLAY_ANIMATION, TABLE_SURFACE } from '../../config/physics.config';
import { calculateCardPosition } from './cardAnimationHelpers';
import {
  blendFromOriginOrientation,
  calculateCardScale,
  toOriginQuaternion,
} from './cardAnimationOrigin';
import { ZERO_ANIMATION_OFFSETS } from './physics-played-card.fixtures';
import type { PlayedCardOriginPose } from './physics-played-card.types';

// An upright hand card in front of the camera
const handPose: PlayedCardOriginPose = {
  position: [-0.38, 3.29, 5.08],
  quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0, 0.1)).toArray() as PlayedCardOriginPose['quaternion'],
  scale: 0.58,
};

const flightQuaternion = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.3, 'YXZ'));

describe('calculateCardScale', () => {
  it('starts at the rendered size of the card it replaces', () => {
    expect(calculateCardScale(0, 0.9, 0.78)).toBeCloseTo(0.78);
  });

  it('falls back to the default launch size without an origin', () => {
    expect(calculateCardScale(0, 0.9)).toBeCloseTo(PLAY_ANIMATION.START_SCALE);
  });

  it('reaches table size before landing', () => {
    expect(calculateCardScale(1 / PLAY_ANIMATION.SCALE_IN_SPEED, 0.9, 0.78)).toBeCloseTo(0.9);
  });
});

describe('blendFromOriginOrientation', () => {
  it('starts in the held orientation', () => {
    const origin = toOriginQuaternion(handPose);
    const blended = blendFromOriginOrientation(flightQuaternion(), origin, 0);

    expect(origin).not.toBeNull();
    expect(blended.angleTo(origin as THREE.Quaternion)).toBeCloseTo(0);
  });

  it('hands over to the flight orientation by ORIGIN_BLEND_END', () => {
    const blended = blendFromOriginOrientation(
      flightQuaternion(), toOriginQuaternion(handPose), PLAY_ANIMATION.ORIGIN_BLEND_END
    );

    expect(blended.angleTo(flightQuaternion())).toBeCloseTo(0);
  });

  it('turns smoothly between the two', () => {
    const origin = toOriginQuaternion(handPose) as THREE.Quaternion;
    const totalAngle = origin.angleTo(flightQuaternion());
    let previous = blendFromOriginOrientation(flightQuaternion(), origin, 0).clone();
    for (let step = 1; step <= 10; step++) {
      const current = blendFromOriginOrientation(
        flightQuaternion(), origin, (step / 10) * PLAY_ANIMATION.ORIGIN_BLEND_END
      ).clone();
      expect(current.angleTo(previous)).toBeLessThan(totalAngle * 0.5);
      previous = current;
    }
  });

  it('leaves the flight orientation alone without an origin', () => {
    const blended = blendFromOriginOrientation(flightQuaternion(), toOriginQuaternion(undefined), 0);
    expect(blended.angleTo(flightQuaternion())).toBeCloseTo(0);
  });
});

describe('calculateCardPosition with an origin pose', () => {
  const params = {
    posProgress: 0,
    effectiveStartPosition: [0, 0.3, 2.47] as [number, number, number],
    effectiveTargetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0.97] as [number, number, number],
    randomOffsets: ZERO_ANIMATION_OFFSETS,
    playOrder: 0,
    totalCards: 1,
    isLocalPlayer: true,
  };

  it('launches from the hand card instead of the fixed seat start', () => {
    const position = calculateCardPosition({ ...params, rawProgress: 0, originPosition: handPose.position });

    expect(position.toArray()).toEqual(handPose.position);
  });

  it('still rests on the same spot the collection starts from', () => {
    const withOrigin = calculateCardPosition({
      ...params, rawProgress: 1, posProgress: 1, originPosition: handPose.position,
    });
    const withoutOrigin = calculateCardPosition({ ...params, rawProgress: 1, posProgress: 1 });

    expect(withOrigin.distanceTo(withoutOrigin)).toBeCloseTo(0);
  });
});
