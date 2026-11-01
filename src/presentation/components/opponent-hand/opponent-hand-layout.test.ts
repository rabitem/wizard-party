import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { OPPONENT_HAND_LAYOUT, OPPONENT_HAND_WOBBLE } from '@/presentation/config/layout.config';
import { computeOpponentHandLayout, writeOpponentHandMatrices } from './opponent-hand-layout';

const FLOATS_PER_MATRIX = 16;
// Instance matrices are stored as float32
const FLOAT32_TOLERANCE = 1e-6;
const MAX_EDGE_FACTOR = 1 + OPPONENT_HAND_WOBBLE.POSITION_INFLUENCE;

function createInstanceAttribute(slots: number): THREE.InstancedBufferAttribute {
  return new THREE.InstancedBufferAttribute(new Float32Array(slots * FLOATS_PER_MATRIX), FLOATS_PER_MATRIX);
}

/** Instance matrix of one card, read back from the uploaded attribute */
function readSlot(attribute: THREE.InstancedBufferAttribute, index: number): THREE.Matrix4 {
  return new THREE.Matrix4().fromArray(attribute.array as Float32Array, index * FLOATS_PER_MATRIX);
}

function expectWithinWobble(position: THREE.Vector3, pose: { x: number; y: number }): void {
  expect(Math.abs(position.y - pose.y)).toBeLessThanOrEqual(OPPONENT_HAND_WOBBLE.AMPLITUDE_Y * MAX_EDGE_FACTOR + FLOAT32_TOLERANCE);
  expect(Math.abs(position.x - pose.x)).toBeLessThanOrEqual(OPPONENT_HAND_WOBBLE.AMPLITUDE_X * MAX_EDGE_FACTOR + FLOAT32_TOLERANCE);
}

describe('computeOpponentHandLayout', () => {
  it('should return no cards for an empty hand', () => {
    expect(computeOpponentHandLayout(0)).toEqual([]);
  });

  it('should centre a single card without fan rotation', () => {
    const [card] = computeOpponentHandLayout(1);
    expect(card.x).toBe(0);
    expect(card.rotZ).toBe(0);
  });

  it('should fan cards symmetrically and stack them upward', () => {
    const layout = computeOpponentHandLayout(5);
    expect(layout).toHaveLength(5);
    expect(layout[0].x).toBeCloseTo(-layout[4].x);
    expect(layout[0].rotZ).toBeCloseTo(-layout[4].rotZ);
    expect(layout[4].y).toBeCloseTo(4 * OPPONENT_HAND_LAYOUT.STACK_HEIGHT_PER_CARD);
  });

  it('should keep large hands within the maximum spread and arc', () => {
    const layout = computeOpponentHandLayout(20);
    expect(layout[19].x - layout[0].x).toBeLessThanOrEqual(OPPONENT_HAND_LAYOUT.MAX_SPREAD + 1e-9);
    expect(layout[19].rotZ - layout[0].rotZ).toBeLessThanOrEqual(OPPONENT_HAND_LAYOUT.MAX_ARC_ANGLE + 1e-9);
  });
});

describe('writeOpponentHandMatrices', () => {
  it('should keep the breathing wobble within its configured amplitude', () => {
    const layout = computeOpponentHandLayout(6);
    const attribute = createInstanceAttribute(layout.length);
    const position = new THREE.Vector3();
    for (let t = 0; t < 10; t += 0.37) {
      writeOpponentHandMatrices(layout, t, attribute);
      layout.forEach((pose, i) => expectWithinWobble(position.setFromMatrixPosition(readSlot(attribute, i)), pose));
    }
  });

  it('should lay cards flat on the table, back facing up', () => {
    const layout = computeOpponentHandLayout(1);
    const attribute = createInstanceAttribute(1);
    writeOpponentHandMatrices(layout, 0, attribute);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(readSlot(attribute, 0));
    expect(normal.y).toBeGreaterThan(0.95);
  });

  it('should write one matrix per card and flag the attribute for upload', () => {
    const layout = computeOpponentHandLayout(3);
    const attribute = createInstanceAttribute(20);
    const versionBefore = attribute.version;
    writeOpponentHandMatrices(layout, 1.5, attribute);

    const lastCard = new THREE.Vector3().setFromMatrixPosition(readSlot(attribute, 2));
    expectWithinWobble(lastCard, layout[2]);
    expect(lastCard.z).toBeCloseTo(layout[2].z, 6);
    // Slots past the hand stay untouched (an unwritten matrix is all zeros)
    expect(Array.from(attribute.array.slice(3 * FLOATS_PER_MATRIX, 4 * FLOATS_PER_MATRIX)).every((value) => value === 0)).toBe(true);
    expect(attribute.version).toBeGreaterThan(versionBefore);
  });
});
