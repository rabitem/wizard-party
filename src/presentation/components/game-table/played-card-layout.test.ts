import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_DIMENSIONS, TABLE_SURFACE } from '../../config/physics.config';
import { getStaticPlayedCardPosition } from './played-card-layout';

function getLowestCardPointY(
  centerY: number,
  rotation: [number, number, number],
  scale: number
): number {
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2], 'YXZ')
  );
  const elements = matrix.elements;
  const halfWidth = (CARD_DIMENSIONS.WIDTH * scale) / 2;
  const halfHeight = (CARD_DIMENSIONS.HEIGHT * scale) / 2;
  const halfThickness = (CARD_DIMENSIONS.THICKNESS * scale) / 2;
  const verticalHalfExtent =
    Math.abs(elements[1]) * halfWidth +
    Math.abs(elements[5]) * halfHeight +
    Math.abs(elements[9]) * halfThickness;

  return centerY - verticalHalfExtent;
}

describe('getStaticPlayedCardPosition', () => {
  it('keeps non-animated bot played cards fully above the felt', () => {
    const scale = 0.9;
    const rotation: [number, number, number] = [-Math.PI / 2, 0.35, 0];
    const position = getStaticPlayedCardPosition({
      targetPosition: [1, TABLE_SURFACE.CARD_REST_Y, 0],
      targetRotation: rotation,
      scale,
    });

    expect(getLowestCardPointY(position[1], rotation, scale)).toBeGreaterThanOrEqual(
      TABLE_SURFACE.FELT_Y + TABLE_SURFACE.EPSILON
    );
  });
});
