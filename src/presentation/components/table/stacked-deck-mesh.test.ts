import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CardType, Suit } from '@shared/domain';
import { CARD_DIMENSIONS } from '@/presentation/config/card-physics';
import { createStackedDeckMesh } from './stacked-deck-mesh';
import { getStackedDeckCardLayout } from './stacked-deck-layout';

describe('collected-card mesh', () => {
  it('keeps every card pose and gives each face a separate padded tile in two draws', () => {
    const placements = ['a', 'b'].map((id, index) => ({
      card: { id, type: CardType.NUMBER, suit: Suit.GIANTS, value: index + 1 },
      layout: getStackedDeckCardLayout({ cardId: id, hiddenCount: 0, visibleIndex: index }),
    }));
    const resources = createStackedDeckMesh(placements);
    expect(resources.front.getIndex()?.count).toBe(12);
    expect(resources.back.getIndex()?.count).toBe(60);
    const index = resources.front.getIndex();
    if (!index) throw new Error('Collected-card fronts must be indexed');
    const uv = resources.front.getAttribute('uv');
    const tiles: number[][] = [[], []];
    for (let card = 0; card < 2; card++) {
      for (let i = 0; i < 6; i++) tiles[card].push(uv.getX(index.getX(card * 6 + i)));
    }
    expect(Math.max(...tiles[0])).toBeLessThan(Math.min(...tiles[1]));
    expect(Math.min(...tiles[0])).toBeGreaterThan(0);
    expect(Math.max(...tiles[1])).toBeLessThan(1);
    const position = resources.front.getAttribute('position');
    const first = new THREE.Vector3().fromBufferAttribute(position, index.getX(0));
    const local = first.sub(new THREE.Vector3(...placements[0].layout.position))
      .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...placements[0].layout.rotation)).invert())
      .divideScalar(placements[0].layout.scale);
    expect(Math.abs(local.x)).toBeCloseTo(CARD_DIMENSIONS.WIDTH / 2);
    expect(Math.abs(local.y)).toBeCloseTo(CARD_DIMENSIONS.HEIGHT / 2);
    expect(local.z).toBeCloseTo(CARD_DIMENSIONS.THICKNESS / 2);
    resources.dispose();
  });
});
