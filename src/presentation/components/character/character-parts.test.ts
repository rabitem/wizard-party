import { Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from '@shared/domain/character';

import { applyAppearance } from './character-parts';

function part(id: string): Object3D {
  const node = new Object3D();
  node.userData.part = id;
  return node;
}

describe('applyAppearance', () => {
  it('should show exactly the chosen parts, including every node of a multi-mesh outfit, and leave the rig alone', () => {
    const bone = new Object3D();
    const nodes = [part('head:mage'), part('head:knight'), part('outfit:mage'), part('outfit:mage'), part('outfit:knight'), part('off:spellbook')];
    const model = new Group().add(bone, ...nodes);

    applyAppearance(model, { ...DEFAULT_APPEARANCE, offHand: 'off:none' });

    expect(nodes.map((node) => node.visible)).toEqual([true, false, true, true, false, false]);
    expect(bone.visible).toBe(true);
  });
});
