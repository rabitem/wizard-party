import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_DIMENSIONS, TABLE_SURFACE } from '../../config/physics.config';
import { TABLE_PHYSICS } from '../../config/rapier.config';
import { ZERO_ANIMATION_OFFSETS } from './physics-played-card.fixtures';
import { calculatePlayedCardRestPosition } from './played-card-rest-position';

describe('calculatePlayedCardRestPosition', () => {
  it('uses the local drop landing point when collection starts after a drag play', () => {
    const restPosition = calculatePlayedCardRestPosition({
      cardId: 'player-1-card-1',
      isLocalPlayer: true,
      startPosition: [-2, 0.3, 0],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      playOrder: 0,
      totalCards: 1,
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      dropInfo: {
        dropPosition: new THREE.Vector3(1.2, TABLE_SURFACE.CARD_REST_Y, -0.3),
        startPosition: new THREE.Vector3(1.2, 0.35, -0.3),
        velocity: new THREE.Vector3(0, 0, 0),
        isSlowDrop: true,
      },
    });

    expect(restPosition[0]).toBeCloseTo(1.2);
    expect(restPosition[1]).toBeCloseTo(TABLE_SURFACE.CARD_REST_Y);
    expect(restPosition[2]).toBeCloseTo(-0.3);
  });

  it('uses server physics landing positions for remote collection starts', () => {
    const restPosition = calculatePlayedCardRestPosition({
      cardId: 'player-2-card-2',
      isLocalPlayer: false,
      startPosition: [-2, 0.3, 0],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      playOrder: 0,
      totalCards: 1,
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      physicsState: {
        startPosition: { x: 1, y: 0.35, z: 0.2 },
        landingPosition: { x: 1.3, y: TABLE_SURFACE.CARD_REST_Y, z: 0.4 },
        throwVelocity: { x: 0, y: 0, z: 0 },
        physicsSeed: 123,
      },
    });

    expect(restPosition[0]).toBeCloseTo(1.3);
    expect(restPosition[1]).toBeCloseTo(TABLE_SURFACE.CARD_REST_Y);
    expect(restPosition[2]).toBeCloseTo(0.4);
  });

  it('starts remote collections at the thrower seat in this client scene', () => {
    const restPosition = calculatePlayedCardRestPosition({
      cardId: 'player-2-card-3',
      isLocalPlayer: false,
      startPosition: [-2.47, 0.3, 0],
      targetPosition: [-0.97, TABLE_SURFACE.CARD_REST_Y, 0],
      playOrder: 0,
      totalCards: 1,
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      // Recorded in the thrower's scene, where its own seat is at +Z
      physicsState: {
        startPosition: { x: 0, y: 0.35, z: 2.3 },
        landingPosition: { x: 0, y: TABLE_SURFACE.CARD_REST_Y, z: 1.3 },
        throwVelocity: { x: 0, y: 0, z: -4 },
        physicsSeed: 123,
      },
      // The thrower sits on this client's left (-X)
      seatRotation: -Math.PI / 2,
    });

    expect(restPosition[0]).toBeCloseTo(-1.3);
    expect(restPosition[2]).toBeCloseTo(0);
  });

  it('clamps local drag landing points inside the readable table edge', () => {
    const cardScale = 0.9;
    const restPosition = calculatePlayedCardRestPosition({
      cardId: 'player-1-card-edge',
      isLocalPlayer: true,
      startPosition: [-2, 0.3, 0],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      playOrder: 0,
      totalCards: 1,
      cardScale,
      randomOffsets: ZERO_ANIMATION_OFFSETS,
      dropInfo: {
        dropPosition: new THREE.Vector3(4, TABLE_SURFACE.CARD_REST_Y, 0),
        startPosition: new THREE.Vector3(1.2, 0.35, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        isSlowDrop: true,
      },
    });

    const halfDiagonal = Math.hypot(CARD_DIMENSIONS.WIDTH * cardScale, CARD_DIMENSIONS.HEIGHT * cardScale) / 2;
    expect(Math.hypot(restPosition[0], restPosition[2]) + halfDiagonal).toBeLessThanOrEqual(TABLE_PHYSICS.RADIUS + 1e-6);
    expect(restPosition[0]).toBeLessThan(4);
  });
});
