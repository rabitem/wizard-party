import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { createInitialPhysicsState, isFollowingDrag, updatePhysics } from './useDraggedCardPhysics';

function follow(fps: number, seconds: number): number {
  const groupRef = { current: new THREE.Group() };
  const p = createInitialPhysicsState(new THREE.Vector3(2, 0, 2.5), 0.65);
  const target = new THREE.Vector3(2, 0, 1.5);
  for (let frame = 0; frame < Math.round(fps * seconds); frame++) {
    updatePhysics({
      delta: 1 / fps,
      worldPosition: target,
      playZoneProximity: 0,
      baseScale: 0.65,
      isCollidingWithTrump: false,
      collidingCards: new Map(),
      rigidBodyRef: { current: null },
      groupRef,
    }, p);
  }
  return p.posZ;
}

describe('isFollowingDrag', () => {
  it('follows only the live drag of this card', () => {
    expect(isFollowingDrag({ isDragging: true, cardId: 'ELVES-8' }, 'ELVES-8')).toBe(true);
  });

  it('holds the release pose once the drag state is reset or belongs to another card', () => {
    expect(isFollowingDrag({ isDragging: false, cardId: null }, 'ELVES-8')).toBe(false);
    expect(isFollowingDrag({ isDragging: true, cardId: 'GIANTS-11' }, 'ELVES-8')).toBe(false);
  });
});

describe('updatePhysics drag follow', () => {
  it('follows the pointer at the same pace at 30, 60 and 120 fps', () => {
    const at60 = follow(60, 0.1);

    expect(follow(30, 0.1)).toBeCloseTo(at60, 4);
    expect(follow(120, 0.1)).toBeCloseTo(at60, 4);
  });
});
