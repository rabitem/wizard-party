import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TABLE_PHYSICS } from '@/presentation/config/rapier.config';
import { SURFACE_LAYOUT } from './surface.config';
import { createDriftRingGeometry, createRadialRingGeometry, rimFrame } from './surface-geometry';
import { POOL_EDGE } from './summer/pool-surface.assets';
import { AUTUMN_DRY_LEAVES } from './themes/autumn-surface.assets';
import { PIXEL_BLOCK_ROWS } from './themes/pixel-surface.assets';

const position = new THREE.Vector3();

describe('themed table surface layout', () => {
  it('keeps the play disc at the collider surface height', () => {
    expect(SURFACE_LAYOUT.FELT_Y).toBe(TABLE_PHYSICS.HEIGHT);
  });

  it('keeps the pool wall and coping outside the play radius', () => {
    expect(POOL_EDGE.WALL_RADIUS).toBeGreaterThan(SURFACE_LAYOUT.PLAY_RADIUS);
  });

  it('keeps the pixel battlements outside the play radius', () => {
    PIXEL_BLOCK_ROWS.forEach((row) => {
      expect(row.radius - row.depth / 2).toBeGreaterThan(SURFACE_LAYOUT.PLAY_RADIUS);
    });
  });

  it('lays the autumn dry leaves on the felt edge band outside the play radius', () => {
    AUTUMN_DRY_LEAVES.matrices.forEach((matrix) => {
      position.setFromMatrixPosition(matrix);
      const radius = Math.hypot(position.x, position.z);
      expect(radius).toBeGreaterThan(SURFACE_LAYOUT.PLAY_RADIUS);
      expect(radius).toBeLessThan(SURFACE_LAYOUT.EDGE_OUTER);
    });
  });
});

describe('createRadialRingGeometry', () => {
  it('runs u around the ring and v from inner to outer edge', () => {
    const geometry = createRadialRingGeometry(1, 2, 8, 4);
    const uv = geometry.attributes.uv;
    expect(uv.getX(0)).toBe(0);
    expect(uv.getY(0)).toBe(0);
    expect(uv.getX(8)).toBe(4);
    expect(uv.getY(9)).toBe(1);
  });
});

describe('createDriftRingGeometry', () => {
  it('never dips below its base height', () => {
    const geometry = createDriftRingGeometry({ radius: 3, width: 0.1, height: 0.05, baseY: -0.01, segments: 16 });
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) expect(positions.getY(i)).toBeGreaterThanOrEqual(-0.01 - 1e-9);
  });
});

describe('rimFrame', () => {
  it('places angle 0 at the local player (+z) with local +z pointing outward', () => {
    const frame = rimFrame(0, 3);
    expect(frame.position[0]).toBeCloseTo(0);
    expect(frame.position[2]).toBeCloseTo(3);
    const outward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), frame.rotationY);
    expect(outward.z).toBeCloseTo(1);
  });

  it('points outward at any rim angle', () => {
    const frame = rimFrame(105, 2.88);
    const outward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), frame.rotationY);
    const radial = new THREE.Vector3(frame.position[0], 0, frame.position[2]).normalize();
    expect(outward.dot(radial)).toBeCloseTo(1);
  });
});
