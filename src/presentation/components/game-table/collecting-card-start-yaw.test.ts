import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { calculateCardRotation } from '../three/cardAnimationHelpers';
import { createCardAnimationOffsets } from '../three/useCardAnimationOffsets';
import { getPlayedCardRestYaw } from './collecting-card-start-yaw';

/** Direction of the card's long edge on the table, for a card posed with a YXZ Euler */
function longEdgeHeading(x: number, y: number, z: number): number {
  const edge = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(x, y, z, 'YXZ'));
  return Math.atan2(edge.x, edge.z);
}

function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/** A local card let go gently over the table: the played card animates as a slow drop */
const SLOW_DROP = {
  dropPosition: new THREE.Vector3(0.2, 0.1, 0.4),
  startPosition: new THREE.Vector3(0.2, 0.5, 1.8),
  velocity: new THREE.Vector3(0, 0, -0.1),
  isSlowDrop: true,
};

describe('getPlayedCardRestYaw', () => {
  it.each([
    { cardId: 'p2-fire-7', isLocalPlayer: false, seatRotation: -2.4, physicsState: { physicsSeed: 913 }, dropInfo: undefined },
    { cardId: 'p1-wizard-0', isLocalPlayer: true, seatRotation: -0.3, physicsState: undefined, dropInfo: undefined },
    { cardId: 'p4-ice-12', isLocalPlayer: false, seatRotation: -5.1, physicsState: undefined, dropInfo: undefined },
    { cardId: 'p1-earth-9', isLocalPlayer: true, seatRotation: -0.3, physicsState: { physicsSeed: 4242 }, dropInfo: SLOW_DROP },
  ])('matches the heading of the resting played card ($cardId)', ({ cardId, isLocalPlayer, seatRotation, physicsState, dropInfo }) => {
    const randomOffsets = createCardAnimationOffsets({ cardId, isLocalPlayer, physicsState });
    // A seeded settle roll must be present, or matching the heading would not prove the roll is included
    if (physicsState) expect(randomOffsets.finalRotZ).not.toBe(0);

    const rest = calculateCardRotation({
      rawProgress: 1,
      posProgress: 1,
      elapsedTime: 0,
      isLocalPlayer,
      targetRotation: [-Math.PI / 2, seatRotation, 0],
      randomOffsets,
      isSlowDrop: dropInfo?.isSlowDrop ?? false,
    });
    const yaw = getPlayedCardRestYaw({ cardId, isLocalPlayer, seatRotation, dropInfo, physicsState });

    // The collecting card is posed YXZ(-PI/2, yaw, 0): its long edge must point where the played card's did
    expect(angleBetween(longEdgeHeading(-Math.PI / 2, yaw, 0), longEdgeHeading(rest.x, rest.y, rest.z))).toBeLessThan(0.01);
  });
});
