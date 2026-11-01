import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  ZERO_POSITION_OFFSET,
  applyReturnPose,
  createCardMotionState,
  deriveHandCardVisualState,
  getAnimationTargets,
  getCardVisualLift,
  getCardVisualTint,
  updateCardMotion,
  type Vec3Tuple,
} from './Card3D.motion';

const SCALE = 0.5;

function stepCard(
  group: THREE.Group,
  physics: ReturnType<typeof createCardMotionState>,
  position: Vec3Tuple,
  options: { positionOffset?: Vec3Tuple; dt?: number; frames?: number } = {}
): void {
  const { positionOffset = ZERO_POSITION_OFFSET, dt = 1 / 60, frames = 1 } = options;
  for (let frame = 0; frame < frames; frame++) {
    updateCardMotion({
      group, physics, targets: getAnimationTargets(false, false, false, SCALE),
      isSelected: false, isDragging: false, position, positionOffset, rotation: [0, 0, 0],
      visualState: 'idle', dt, time: frame * dt,
    });
  }
}

describe('updateCardMotion', () => {
  it('glides to a new slot instead of snapping (hand re-layout, shuffle/sort reorder)', () => {
    const group = new THREE.Group();
    const physics = createCardMotionState([0, 0, 0], SCALE, 'idle', 0);

    stepCard(group, physics, [1, 0, 0]);
    expect(group.position.x).toBeGreaterThan(0);
    expect(group.position.x).toBeLessThan(0.5);

    stepCard(group, physics, [1, 0, 0], { frames: 60 });
    expect(group.position.x).toBeCloseTo(1, 3);
  });

  it('eases into a slot change from rest, so a card that moves across the hand never jumps in one frame', () => {
    // A 20-card two-row hand losing a back-row card: the front row's first card moves to the
    // back row's last slot, about a whole hand width away.
    const group = new THREE.Group();
    const physics = createCardMotionState([-0.53, 0, 0], SCALE, 'idle', 0);
    const steps: number[] = [];
    let previous = -0.53;
    for (let frame = 0; frame < 40; frame++) {
      stepCard(group, physics, [0.53, 0.17, 0]);
      steps.push(group.position.x - previous);
      previous = group.position.x;
    }

    const fastest = Math.max(...steps);
    expect(steps[0]).toBeLessThan(fastest / 2);
    expect(fastest).toBeLessThan(1.06 * 0.12);
  });

  it('applies the animation offset on top of the slot without smoothing', () => {
    const group = new THREE.Group();
    const physics = createCardMotionState([0.2, 0, 0], SCALE, 'idle', 0);

    stepCard(group, physics, [0.2, 0, 0], { positionOffset: [0.1, 0, 0.03] });

    expect(group.position.x).toBeCloseTo(0.3, 6);
    expect(group.position.z).toBeCloseTo(0.03, 6);
  });

  it('settles a slot change in the same time at 30, 60 and 120 fps', () => {
    const positionAfter = (fps: number) => {
      const group = new THREE.Group();
      const physics = createCardMotionState([0, 0, 0], SCALE, 'idle', 0);
      stepCard(group, physics, [1, 0, 0], { dt: 1 / fps, frames: fps / 10 });
      return group.position.x;
    };

    expect(positionAfter(30)).toBeCloseTo(positionAfter(60), 6);
    expect(positionAfter(120)).toBeCloseTo(positionAfter(60), 6);
  });
});

describe('applyReturnPose', () => {
  it('starts a returning card at the drop point and its dragged size, then brings it home', () => {
    const hand = new THREE.Group();
    hand.position.set(0, 3.4, 5);
    const group = new THREE.Group();
    hand.add(group);
    const physics = createCardMotionState([0.3, 0.1, 0], SCALE, 'idle', 0);
    const dropPoint = new THREE.Vector3(0.6, 0.35, 2.4);

    applyReturnPose(group, physics, { position: dropPoint, scale: 0.78 }, ZERO_POSITION_OFFSET);
    stepCard(group, physics, [0.3, 0.1, 0], { dt: 0 });

    expect(group.getWorldPosition(new THREE.Vector3()).distanceTo(dropPoint)).toBeLessThan(1e-6);
    expect(group.scale.x).toBeCloseTo(0.78, 6);

    stepCard(group, physics, [0.3, 0.1, 0], { frames: 90 });
    expect(group.position.x).toBeCloseTo(0.3, 3);
    expect(group.position.y).toBeCloseTo(0.1, 3);
    expect(group.scale.x).toBeCloseTo(SCALE, 2);
  });
});

describe('hand card visual state', () => {
  it('keeps every card idle (full brightness, no lift) outside a local play decision', () => {
    expect(deriveHandCardVisualState({ isCurrentPlayer: false, playableCount: 3, isPlayable: true })).toBe('idle');
    // Bidding on your own turn: nothing is playable yet, so nothing is dimmed
    expect(deriveHandCardVisualState({ isCurrentPlayer: true, playableCount: 0, isPlayable: false })).toBe('idle');
    expect(getCardVisualTint('idle')).toBe(1);
    expect(getCardVisualLift('idle')).toBe(0);
  });

  it('separates legal from illegal cards on the local playing turn', () => {
    expect(deriveHandCardVisualState({ isCurrentPlayer: true, playableCount: 2, isPlayable: true })).toBe('legal');
    expect(deriveHandCardVisualState({ isCurrentPlayer: true, playableCount: 2, isPlayable: false })).toBe('illegal');
    expect(getCardVisualTint('legal')).toBe(1);
    expect(getCardVisualTint('illegal')).toBeLessThan(1);
    expect(getCardVisualTint('illegal')).toBeGreaterThan(0.3);
    expect(getCardVisualLift('legal')).toBeGreaterThan(0);
    expect(getCardVisualLift('illegal')).toBeLessThan(0);
  });

  it('fades the tint toward the state instead of jumping', () => {
    const group = new THREE.Group();
    const physics = createCardMotionState([0, 0, 0], SCALE, 'legal', 0);
    updateCardMotion({
      group, physics, targets: getAnimationTargets(false, false, false, SCALE),
      isSelected: false, isDragging: false, position: [0, 0, 0], positionOffset: ZERO_POSITION_OFFSET, rotation: [0, 0, 0],
      visualState: 'illegal', dt: 1 / 60, time: 0,
    });
    expect(physics.tint).toBeLessThan(1);
    expect(physics.tint).toBeGreaterThan(getCardVisualTint('illegal'));
  });
});
