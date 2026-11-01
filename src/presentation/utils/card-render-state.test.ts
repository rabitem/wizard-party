import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_STACKING } from '@/presentation/config/physics.config';
import { applyCardRenderMode, getHandCardRenderOrder } from './card-render-state';

describe('applyCardRenderMode', () => {
  it('should draw hand cards on top of the table without depth test or depth write, fully opaque', () => {
    const material = new THREE.MeshStandardMaterial({ opacity: 0.4 });
    applyCardRenderMode(material, 'hand');

    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.alphaTest).toBe(0);
    expect(material.opacity).toBe(1);
  });

  it('should keep table cards as ordinary opaque, depth-tested objects', () => {
    const material = new THREE.MeshStandardMaterial();
    applyCardRenderMode(material, 'table');

    expect(material.transparent).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(true);
    expect(material.opacity).toBe(1);
  });
});

describe('getHandCardRenderOrder', () => {
  it('should stack later hand slots above earlier ones, above everything on the table', () => {
    expect(getHandCardRenderOrder(0)).toBe(CARD_STACKING.HAND_RENDER_ORDER);
    expect(getHandCardRenderOrder(3)).toBeGreaterThan(getHandCardRenderOrder(2));
    expect(getHandCardRenderOrder(-1)).toBe(CARD_STACKING.HAND_RENDER_ORDER);
  });
});
