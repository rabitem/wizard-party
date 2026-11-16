import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createScreenAtlas, createScreenGeometry } from './pixel-screens';

function sample(texture: THREE.Texture, u: number, v: number): THREE.Vector2 {
  texture.updateMatrix();
  return new THREE.Vector2(u, v).applyMatrix3(texture.matrix);
}

describe('cabinet sprite sheet', () => {
  it('advances both the screen and its reflection without uploading new pixels', () => {
    const atlas = createScreenAtlas();
    const start = sample(atlas.texture, 0.5, 0.5);
    const versions = [atlas.texture.version, atlas.reflection.version];
    atlas.setFrame(1);
    const next = sample(atlas.texture, 0.5, 0.5);
    expect(next.x).toBeGreaterThan(start.x);
    expect(next.y).toBe(start.y);
    expect(sample(atlas.reflection, 0.5, 0.5)).toEqual(next);
    expect([atlas.texture.version, atlas.reflection.version]).toEqual(versions);
  });

  it('keeps all mini-game tiles inside the selected frame, including on a later sheet row', () => {
    const atlas = createScreenAtlas();
    atlas.setFrame(7);
    const centres = [0, 1, 2, 3].map(variant => {
      const geometry = createScreenGeometry(variant, 1, 1);
      const uv = geometry.getAttribute('uv');
      return sample(atlas.texture, (uv.getX(0) + uv.getX(1)) / 2, 0.5);
    });
    expect(centres.every(p => p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1)).toBe(true);
    expect(centres.map(p => p.x)).toEqual([...centres.map(p => p.x)].sort((a, b) => a - b));
    expect(new Set(centres.map(p => p.x)).size).toBe(4);
    expect(new Set(centres.map(p => p.y)).size).toBe(1);
  });
});
