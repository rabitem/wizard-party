import { describe, expect, it } from 'vitest';
import { SIMULATED_BODY_KEY, getRigidBodyPoseKey } from './rigid-body-pose-key';

describe('getRigidBodyPoseKey', () => {
  const position: [number, number, number] = [0.01, 0.026, -0.004];
  const rotation: [number, number, number] = [-Math.PI / 2, 0, 0.03];

  it('should keep a fixed body when it re-renders with the same layout', () => {
    expect(getRigidBodyPoseKey('fixed', [...position], [...rotation])).toBe(
      getRigidBodyPoseKey('fixed', position, rotation)
    );
  });

  it('should re-create a fixed body when its stack height changes', () => {
    const reflowed: [number, number, number] = [position[0], 0.057, position[2]];

    expect(getRigidBodyPoseKey('fixed', reflowed, rotation)).not.toBe(
      getRigidBodyPoseKey('fixed', position, rotation)
    );
  });

  it('should re-create a fixed body when its rotation changes', () => {
    const turned: [number, number, number] = [-Math.PI / 2, 0, -0.02];

    expect(getRigidBodyPoseKey('fixed', position, turned)).not.toBe(
      getRigidBodyPoseKey('fixed', position, rotation)
    );
  });

  it('should never re-create a simulated body from its initial pose props', () => {
    expect(getRigidBodyPoseKey('dynamic', position, rotation)).toBe(SIMULATED_BODY_KEY);
    expect(getRigidBodyPoseKey('dynamic', [1, 2, 3], rotation)).toBe(SIMULATED_BODY_KEY);
    expect(getRigidBodyPoseKey('kinematicPosition', position, rotation)).toBe(SIMULATED_BODY_KEY);
  });
});
