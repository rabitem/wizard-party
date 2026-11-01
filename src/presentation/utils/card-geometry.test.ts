import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_DIMENSIONS } from '@/presentation/config/card-physics';
import { CARD_EDGE_SWATCH, CARD_FACE_LOGICAL_SIZE } from '@/presentation/config/card-render.config';
import { CARD_MATERIAL_SLOT, getCardGeometry } from './card-geometry';

describe('getCardGeometry', () => {
  it('should draw a card with two groups (back + edges, then front) instead of six', () => {
    const geometry = getCardGeometry();
    expect(geometry.groups).toHaveLength(2);
    expect(geometry.groups[0].materialIndex).toBe(CARD_MATERIAL_SLOT.BACK);
    expect(geometry.groups[1].materialIndex).toBe(CARD_MATERIAL_SLOT.FRONT);
    // back + four edges = 5 quads, front = 1 quad (6 indices per quad)
    expect(geometry.groups[0].count).toBe(5 * 6);
    expect(geometry.groups[1].count).toBe(6);
  });

  it('should keep the card dimensions', () => {
    const geometry = getCardGeometry();
    geometry.computeBoundingBox();
    const size = geometry.boundingBox?.getSize(new THREE.Vector3());
    expect(size?.x).toBeCloseTo(CARD_DIMENSIONS.WIDTH, 6);
    expect(size?.y).toBeCloseTo(CARD_DIMENSIONS.HEIGHT, 6);
    expect(size?.z).toBeCloseTo(CARD_DIMENSIONS.THICKNESS, 6);
  });

  it('should map every edge vertex inside the edge swatch in the corner of the back texture', () => {
    const uv = getCardGeometry().getAttribute('uv');
    // BoxGeometry faces 0..3 are the edges (+X, -X, +Y, -Y), 4 vertices each.
    // Canvas pixels run down from the top-left corner, UV v runs up.
    for (let i = 0; i < 16; i++) {
      const canvasX = uv.getX(i) * CARD_FACE_LOGICAL_SIZE.WIDTH;
      const canvasY = (1 - uv.getY(i)) * CARD_FACE_LOGICAL_SIZE.HEIGHT;
      expect(canvasX).toBeGreaterThanOrEqual(0);
      expect(canvasX).toBeLessThan(CARD_EDGE_SWATCH.SIZE_PX);
      expect(canvasY).toBeGreaterThanOrEqual(0);
      expect(canvasY).toBeLessThan(CARD_EDGE_SWATCH.SIZE_PX);
    }
    // The front (+Z, vertices 16..19) keeps its full 0..1 mapping
    expect(uv.getX(16)).toBe(0);
    expect(uv.getY(16)).toBe(1);
  });

  it('should share one geometry between all card meshes', () => {
    expect(getCardGeometry()).toBe(getCardGeometry());
  });
});
