import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_MATERIAL_SLOT } from '../utils/card-geometry';
import { applyCardTint } from './Card3D';
import { applyCard3DRotation, getCardVisualTint } from './Card3D.motion';

describe('applyCard3DRotation', () => {
  it('keeps a flat played card flat when it also has table-facing Y rotation', () => {
    const group = new THREE.Group();

    applyCard3DRotation({
      group,
      rotation: [-Math.PI / 2, 0.35, 0],
      wobbleX: 0,
      wobbleZ: 0,
      tiltX: 0,
    });

    const elements = new THREE.Matrix4().makeRotationFromEuler(group.rotation).elements;

    expect(group.rotation.order).toBe('YXZ');
    expect(Math.abs(elements[1])).toBeCloseTo(0);
    expect(Math.abs(elements[5])).toBeCloseTo(0);
    expect(Math.abs(elements[9])).toBeCloseTo(1);
  });
});

describe('Card3D hand card tint', () => {
  it('darkens only the front face and never makes the card transparent', () => {
    const front = new THREE.MeshStandardMaterial();
    const back = new THREE.MeshStandardMaterial();
    const materials: THREE.Material[] = [];
    materials[CARD_MATERIAL_SLOT.FRONT] = front;
    materials[CARD_MATERIAL_SLOT.BACK] = back;

    applyCardTint(materials, getCardVisualTint('illegal'));

    expect(front.color.r).toBeCloseTo(getCardVisualTint('illegal'), 6);
    expect(front.opacity).toBe(1);
    expect(front.transparent).toBe(false);
    expect(back.color.r).toBe(1);
  });

  it('restores full brightness for idle cards', () => {
    const front = new THREE.MeshStandardMaterial();
    const materials: THREE.Material[] = [];
    materials[CARD_MATERIAL_SLOT.FRONT] = front;
    materials[CARD_MATERIAL_SLOT.BACK] = new THREE.MeshStandardMaterial();

    applyCardTint(materials, 0.5);
    applyCardTint(materials, getCardVisualTint('idle'));

    expect(front.color.getHex()).toBe(0xffffff);
  });
});
