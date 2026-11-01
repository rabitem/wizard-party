import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { exposedTapWidth, handCardAt, visibleHandCardPoint, type HitTestBridge } from './hand-hit-test';
import type { ScreenRect } from './screen-geometry';

const CANVAS_PX = 400;
/** The strip is sampled every 2 px, so a measured width is within one step of the edges' distance. */
const SAMPLE_STEP_PX = 2;

/** A camera looking down -z at cards 1 x 1.4 units, drawn into a 400 px square canvas. */
function hand(cards: Array<{ id: string; x: number; y?: number; z: number }>): HitTestBridge {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  scene.add(camera);
  for (const { id, x, y = 0, z } of cards) {
    const group = new THREE.Group();
    group.name = `hand-card:${id}`;
    group.position.set(x, y, z);
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

/** Client x of a scene point: expected strips come from the card edges, not from hit testing. */
function clientX(bridge: HitTestBridge, x: number, y: number, z: number): number {
  return bridge.projectToClient(new THREE.Vector3(x, y, z)).x;
}

/** The screen rectangle of a 1 x 1.4 card centred at (x, y, z). */
function cardRect(bridge: HitTestBridge, x: number, y: number, z: number): ScreenRect {
  const topLeft = bridge.projectToClient(new THREE.Vector3(x - 0.5, y + 0.7, z));
  const bottomRight = bridge.projectToClient(new THREE.Vector3(x + 0.5, y - 0.7, z));
  return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
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

  it('should measure a fanned card up to the card laid over it, and the top card in full', () => {
    // Later cards lie on top: A shows up to B's left edge, B up to C's, C all of itself.
    const bridge = hand([{ id: 'A', x: 0, z: 0 }, { id: 'B', x: 0.3, z: 0.01 }, { id: 'C', x: 0.6, z: 0.02 }]);
    const strips = {
      A: exposedTapWidth(bridge, 'A', cardRect(bridge, 0, 0, 0)),
      B: exposedTapWidth(bridge, 'B', cardRect(bridge, 0.3, 0, 0.01)),
      C: exposedTapWidth(bridge, 'C', cardRect(bridge, 0.6, 0, 0.02)),
    };
    expect(Math.abs(strips.A - (clientX(bridge, -0.2, 0, 0.01) - clientX(bridge, -0.5, 0, 0)))).toBeLessThanOrEqual(SAMPLE_STEP_PX);
    expect(Math.abs(strips.B - (clientX(bridge, 0.1, 0, 0.02) - clientX(bridge, -0.2, 0, 0.01)))).toBeLessThanOrEqual(SAMPLE_STEP_PX);
    expect(Math.abs(strips.C - (clientX(bridge, 1.1, 0, 0.02) - clientX(bridge, 0.1, 0, 0.02)))).toBeLessThanOrEqual(SAMPLE_STEP_PX);
  });

  it('should measure a wrapped hand along each card\'s own row, not against the row in front', () => {
    // The front row (D, E) covers the lower 0.6 of the back row and sits half a spacing to the
    // side: across the rows the centres are only 0.15 apart, but B still shows 0.3 to a finger.
    const bridge = hand([
      { id: 'A', x: 0, y: 0.4, z: 0 }, { id: 'B', x: 0.3, y: 0.4, z: 0.01 }, { id: 'C', x: 0.6, y: 0.4, z: 0.02 },
      { id: 'D', x: 0.15, y: -0.4, z: 0.05 }, { id: 'E', x: 0.45, y: -0.4, z: 0.06 },
    ]);
    const shown = clientX(bridge, 0.1, 0.4, 0.02) - clientX(bridge, -0.2, 0.4, 0.01);
    expect(Math.abs(exposedTapWidth(bridge, 'B', cardRect(bridge, 0.3, 0.4, 0.01)) - shown)).toBeLessThanOrEqual(SAMPLE_STEP_PX);
  });

  it('should give a card that is covered everywhere no strip', () => {
    const bridge = hand([{ id: 'C', x: 0.4, z: 0 }, { id: 'B', x: 0.4, z: 0.01 }]);
    expect(exposedTapWidth(bridge, 'C', cardRect(bridge, 0.4, 0, 0))).toBe(0);
  });
});
