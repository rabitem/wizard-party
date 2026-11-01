import { describe, expect, it } from 'vitest';
import { buildVoxelGeometry, extrudeSprite } from './voxel-geometry';
import { getVoxelGeometry, type VoxelModelId } from './voxel-models';

const vertexCount = (ids: Parameters<typeof buildVoxelGeometry>[0]) => buildVoxelGeometry(ids).getAttribute('position').count;

describe('buildVoxelGeometry', () => {
  it('should emit six faces for a single voxel', () => {
    expect(vertexCount({ size: [1, 1, 1], sample: () => '#ffffff' })).toBe(36);
  });

  it('should cull the shared face between neighbouring voxels', () => {
    expect(vertexCount({ size: [2, 1, 1], sample: () => '#ffffff' })).toBe(60);
  });

  it('should anchor base models on y = 0 and centre them on x / z', () => {
    const geometry = buildVoxelGeometry({ size: [4, 2, 2], sample: () => '#ff0000' });
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.toArray()).toEqual([-2, 0, -1]);
    expect(geometry.boundingBox?.max.toArray()).toEqual([2, 2, 1]);
  });

  it('should extrude sprite rows with the top row at the top', () => {
    const model = extrudeSprite(['a.', 'bb'], { a: '#ff0000', b: '#00ff00' });
    expect(model.sample(0, 1, 0)).toBe('#ff0000');
    expect(model.sample(1, 1, 0)).toBeNull();
    expect(model.sample(1, 0, 0)).toBe('#00ff00');
  });
});

describe('voxel models', () => {
  it.each(['mushroom', 'coin', 'bonus', 'brick', 'heart'] as VoxelModelId[])('should build a low-poly %s with vertex colours', (id) => {
    const geometry = getVoxelGeometry(id);
    const count = geometry.getAttribute('position').count;
    expect(count).toBeGreaterThan(0);
    expect(count / 3).toBeLessThan(3000);
    expect(geometry.getAttribute('color').count).toBe(count);
    expect(getVoxelGeometry(id)).toBe(geometry);
  });
});
