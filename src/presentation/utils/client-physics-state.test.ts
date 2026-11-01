import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createClientPhysicsState } from './client-physics-state';

describe('createClientPhysicsState', () => {
  it('serializes drag drop vectors into the client command physics payload', () => {
    const state = createClientPhysicsState({
      dropPosition: new THREE.Vector3(0.55, 0.03, 0),
      startPosition: new THREE.Vector3(1, 0.35, 2),
      velocity: new THREE.Vector3(-3, 0, 1.5),
      isSlowDrop: false,
    });

    expect(state).toEqual({
      throwVelocity: { x: -3, y: 0, z: 1.5 },
      landingPosition: { x: 0.55, y: 0.03, z: 0 },
      startPosition: { x: 1, y: 0.35, z: 2 },
    });
  });

  it('omits physics state when a card was not dragged', () => {
    expect(createClientPhysicsState()).toBeUndefined();
  });
});
