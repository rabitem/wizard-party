import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { handCardAt, visibleHandCardPoint, type HitTestBridge } from './hand-hit-test';

const CANVAS_PX = 400;

/** A camera looking down -z at cards 1 x 1.4 units, drawn into a 400 px square canvas. */
function hand(cards: Array<{ id: string; x: number; z: number }>): HitTestBridge {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  scene.add(camera);
  for (const { id, x, z } of cards) {
    const group = new THREE.Group();
    group.name = `hand-card:${id}`;
    group.position.set(x, 0, z);
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshBasicMaterial()));
    scene.add(group);
  }
  scene.updateMatrixWorld();
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, right: CANVAS_PX, bottom: CANVAS_PX, width: CANVAS_PX, height: CANVAS_PX }),
  } as unknown as HTMLCanvasElement;
  return {
    camera,
    canvas,
    scene,
    findObject: (kind, cardId) => scene.getObjectByName(`${kind}:${cardId}`) ?? null,
    projectToClient: (position) => {
      const ndc = position.clone().project(camera);
      return { x: ((ndc.x + 1) / 2) * CANVAS_PX, y: ((1 - ndc.y) / 2) * CANVAS_PX };
    },
  };
}

function centreOf(bridge: HitTestBridge, cardId: string) {
  const card = bridge.findObject('hand-card', cardId);
  if (!card) throw new Error(`no card ${cardId}`);
  return bridge.projectToClient(card.getWorldPosition(new THREE.Vector3()));
}

describe('hand hit test', () => {
  it('should pick the nearest hand card under the pointer, or none', () => {
    const bridge = hand([{ id: 'A', x: 0, z: 0 }, { id: 'B', x: 0.4, z: 0.01 }]);
    expect(handCardAt(bridge, centreOf(bridge, 'A'))).toBe('B');
    expect(handCardAt(bridge, centreOf(bridge, 'B'))).toBe('B');
    expect(handCardAt(bridge, { x: 2, y: 2 })).toBeNull();
  });

  it('should aim at the centre of a card nothing covers', () => {
    const bridge = hand([{ id: 'A', x: 0, z: 0 }, { id: 'B', x: 0.4, z: 0.01 }]);
    expect(visibleHandCardPoint(bridge, 'B')).toEqual(centreOf(bridge, 'B'));
  });

  it('should aim at the strip a fanned neighbour leaves when it covers the centre', () => {
    const bridge = hand([{ id: 'A', x: 0, z: 0 }, { id: 'B', x: 0.4, z: 0.01 }]);
    const point = visibleHandCardPoint(bridge, 'A');
    expect(point).not.toBeNull();
    if (!point) return;
    expect(handCardAt(bridge, point)).toBe('A');
    expect(point.x).toBeLessThan(centreOf(bridge, 'A').x);
  });

  it('should fall back to the centre of a card that is fully covered', () => {
    const bridge = hand([{ id: 'C', x: 0.4, z: 0 }, { id: 'B', x: 0.4, z: 0.01 }]);
    expect(visibleHandCardPoint(bridge, 'C')).toEqual(centreOf(bridge, 'C'));
  });

  it('should find nothing for a card that is not in the hand', () => {
    expect(visibleHandCardPoint(hand([]), 'A')).toBeNull();
  });
});
