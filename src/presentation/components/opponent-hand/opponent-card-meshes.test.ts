import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { OPPONENT_CARD_MESH } from '@/presentation/config/layout.config';
import {
  getOpponentBackMaterial,
  getOpponentCardGeometries,
  getOpponentEdgeMaterial,
} from './opponent-card-meshes';

describe('opponent card meshes', () => {
  it('should split a card into its two back faces and four thin edges', () => {
    const { backs, edges } = getOpponentCardGeometries();
    expect(backs.getIndex()?.count).toBe(12);
    expect(edges.getIndex()?.count).toBe(24);
    // Both parts draw from one vertex buffer, uploaded once
    expect(backs.getAttribute('position')).toBe(edges.getAttribute('position'));
    expect(getOpponentCardGeometries().backs).toBe(backs);
  });

  it('should share one back material per card-back texture', () => {
    const texture = new THREE.Texture();
    expect(getOpponentBackMaterial(texture)).toBe(getOpponentBackMaterial(texture));
    expect(getOpponentBackMaterial(texture).map).toBe(texture);
    expect(getOpponentBackMaterial(new THREE.Texture())).not.toBe(getOpponentBackMaterial(texture));
  });

  it('should fall back to a plain back colour without a texture', () => {
    const material = getOpponentBackMaterial(null);
    expect(material.map).toBeNull();
    expect(`#${material.color.getHexString()}`).toBe(OPPONENT_CARD_MESH.FALLBACK_BACK_COLOR);
    expect(`#${getOpponentEdgeMaterial().color.getHexString()}`).toBe(OPPONENT_CARD_MESH.EDGE_COLOR);
  });
});
