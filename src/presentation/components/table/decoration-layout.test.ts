import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TABLE_PHYSICS } from '@/presentation/config/rapier.config';
import { CHIP_PLACEMENTS, COASTER_PLACEMENTS, DECORATION_SHAPES } from './decoration-layout';
import { writePlacementMatrices } from './decoration-instances';

/** The table collider is a square cuboid of half extent TABLE_PHYSICS.RADIUS around the centre. */
function restsOnTableCollider([x, , z]: readonly number[]): boolean {
  return Math.abs(x) <= TABLE_PHYSICS.RADIUS && Math.abs(z) <= TABLE_PHYSICS.RADIUS;
}

describe('decoration layout', () => {
  it('should start every knockable decoration above the table collider so it can fall asleep', () => {
    for (const placement of [...CHIP_PLACEMENTS, ...COASTER_PLACEMENTS]) {
      expect(restsOnTableCollider(placement.position), placement.key).toBe(true);
      expect(placement.position[1]).toBeGreaterThanOrEqual(TABLE_PHYSICS.HEIGHT);
    }
  });

  it('should give every decoration body a unique key', () => {
    const keys = [...CHIP_PLACEMENTS, ...COASTER_PLACEMENTS].map((placement) => placement.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should lay coasters flat on the felt, touching it without overlapping', () => {
    for (const coaster of COASTER_PLACEMENTS) {
      const [pitch, , roll] = coaster.rotation;
      expect(pitch, coaster.key).toBe(0);
      expect(roll, coaster.key).toBe(0);
      expect(coaster.position[1] - DECORATION_SHAPES.COASTER.HEIGHT / 2).toBeCloseTo(TABLE_PHYSICS.HEIGHT);
    }
  });
});

describe('writePlacementMatrices', () => {
  it('should write each placement as an instance matrix and flag the upload', () => {
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(COASTER_PLACEMENTS.length * 16), 16);
    const versionBefore = attribute.version;
    writePlacementMatrices(COASTER_PLACEMENTS, attribute);

    const matrix = new THREE.Matrix4().fromArray(attribute.array as Float32Array, 16);
    const position = new THREE.Vector3().setFromMatrixPosition(matrix);
    expect(position.toArray()).toEqual(COASTER_PLACEMENTS[1].position.map((v) => Math.fround(v)));
    expect(attribute.version).toBeGreaterThan(versionBefore);
  });
});
