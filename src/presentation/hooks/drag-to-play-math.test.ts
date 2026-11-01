import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA_CONFIG, CARD_DIMENSIONS, DRAG_CONFIG, TABLE_SURFACE } from '../config/physics.config';
import { TRUMP_ZONE_PHYSICS } from '../config/rapier.config';
import {
  calculateVelocityFromSamples,
  checkFlickToPlay,
  constrainToCollisionBoundary,
  createDragPlane,
  createDropInfoForPlay,
  evaluatePlayZone,
  getCursorOnDragPlane,
  getDraggedCardPosition,
  resolveDragStart,
} from './drag-to-play-math';

const VIEWPORT = { width: 1366, height: 768 };
const PLAY_ZONE_CENTER = new THREE.Vector3(0, 0.15, 0);
// Matches CameraRelativeHand: the hand floats 2.5 units in front of the camera, below centre.
const HAND_DISTANCE = 2.5;
const HAND_VERTICAL_OFFSET = -0.82;

function createCamera(position: [number, number, number] = CAMERA_CONFIG.DESKTOP.POSITION): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.DESKTOP.FOV, VIEWPORT.width / VIEWPORT.height, 0.1, 100);
  camera.position.set(...position);
  camera.lookAt(new THREE.Vector3(...CAMERA_CONFIG.TARGET));
  camera.updateMatrixWorld(true);
  return camera;
}

function handCardWorldPosition(camera: THREE.Camera, localX = 0): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  return camera.position.clone()
    .add(forward.multiplyScalar(HAND_DISTANCE))
    .add(up.multiplyScalar(HAND_VERTICAL_OFFSET))
    .add(right.multiplyScalar(localX));
}

function toScreen(point: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } {
  const ndc = point.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * VIEWPORT.width, y: ((1 - ndc.y) / 2) * VIEWPORT.height };
}

function createDragSession(camera: THREE.PerspectiveCamera, localX = 0) {
  const raycaster = new THREE.Raycaster();
  const dragPlane = createDragPlane();
  const cardWorldPos = handCardWorldPosition(camera, localX);
  const grab = toScreen(cardWorldPos, camera);
  const cursorAt = (x: number, y: number): THREE.Vector3 => {
    const cursor = getCursorOnDragPlane({
      screenX: x, screenY: y, camera, canvasWidth: VIEWPORT.width, canvasHeight: VIEWPORT.height, raycaster, dragPlane,
    });
    if (!cursor) throw new Error('pointer ray misses the drag plane');
    return cursor;
  };
  const { startPosition, grabOffset } = resolveDragStart(cardWorldPos, cursorAt(grab.x, grab.y), camera.position, dragPlane);
  const moveTo = (x: number, y: number) => getDraggedCardPosition(cursorAt(x, y), grabOffset, startPosition);
  return { grab, startPosition, grabOffset, moveTo };
}

describe('resolveDragStart', () => {
  it('starts the dragged card on the drag plane under the grabbed hand card', () => {
    const camera = createCamera();
    const { grab, startPosition, grabOffset } = createDragSession(camera);
    const startOnScreen = toScreen(startPosition, camera);

    expect(startPosition.y).toBe(DRAG_CONFIG.DRAG_PLANE_Y);
    expect(grabOffset.length()).toBeLessThan(1e-6);
    expect(startOnScreen.x).toBeCloseTo(grab.x, 3);
    expect(startOnScreen.y).toBeCloseTo(grab.y, 3);
  });

  it('moves the card with the very first pointer move toward the table', () => {
    const camera = createCamera();
    const { grab, startPosition, moveTo } = createDragSession(camera);

    const moved = moveTo(grab.x, grab.y - 50);

    expect(moved.z).toBeLessThan(startPosition.z - 0.2);
    expect(toScreen(moved, camera).y).toBeCloseTo(grab.y - 50, 3);
  });

  it('keeps the card under the pointer when the hand projects beyond the table edge', () => {
    const camera = createCamera([0, 9, 11]);
    const { grab, startPosition, moveTo } = createDragSession(camera);

    expect(startPosition.z).toBeGreaterThan(DRAG_CONFIG.TABLE_EDGE_LIMIT);
    expect(moveTo(grab.x, grab.y).z).toBeCloseTo(startPosition.z, 6);
    expect(moveTo(grab.x, grab.y - 20).z).toBeLessThan(startPosition.z);
  });
});

describe('evaluatePlayZone', () => {
  it('does not play a grab-and-release or a small 30px nudge', () => {
    const camera = createCamera();
    const { grab, startPosition, moveTo } = createDragSession(camera);

    expect(evaluatePlayZone(startPosition, startPosition, PLAY_ZONE_CENTER)).toEqual({ proximity: 0, isInZone: false });
    expect(evaluatePlayZone(moveTo(grab.x, grab.y - 30), startPosition, PLAY_ZONE_CENTER).isInZone).toBe(false);
  });

  it('plays once the card is dragged toward the table centre', () => {
    const camera = createCamera();
    const { startPosition, moveTo } = createDragSession(camera);
    const centre = toScreen(PLAY_ZONE_CENTER, camera);

    expect(evaluatePlayZone(moveTo(centre.x, centre.y), startPosition, PLAY_ZONE_CENTER).isInZone).toBe(true);
  });

  it('requires travel toward the centre when the hand already projects inside the zone', () => {
    const start = new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 1.5);

    expect(evaluatePlayZone(start, start, PLAY_ZONE_CENTER).isInZone).toBe(false);
    expect(evaluatePlayZone(new THREE.Vector3(1.5, DRAG_CONFIG.DRAG_PLANE_Y, 0.2), start, PLAY_ZONE_CENTER).isInZone).toBe(false);
    expect(evaluatePlayZone(new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 0.9), start, PLAY_ZONE_CENTER).isInZone).toBe(true);
  });
});

describe('checkFlickToPlay', () => {
  const start = new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 3);

  it('plays a fast flick toward the table', () => {
    const released = new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 2.3);
    expect(checkFlickToPlay(new THREE.Vector3(0, 0, -12), released, start, PLAY_ZONE_CENTER)).toBe(true);
  });

  it('ignores fast jitter that has not left the hand', () => {
    const released = new THREE.Vector3(0.05, DRAG_CONFIG.DRAG_PLANE_Y, 2.9);
    expect(checkFlickToPlay(new THREE.Vector3(0, 0, -6), released, start, PLAY_ZONE_CENTER)).toBe(false);
  });

  it('ignores slow releases and flicks away from the table', () => {
    const released = new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 2.3);
    expect(checkFlickToPlay(new THREE.Vector3(0, 0, -1), released, start, PLAY_ZONE_CENTER)).toBe(false);
    expect(checkFlickToPlay(new THREE.Vector3(0, 0, 12), released, start, PLAY_ZONE_CENTER)).toBe(false);
  });
});

describe('createDropInfoForPlay', () => {
  it('starts the played-card animation at the bounded release point above the table', () => {
    const dropPosition = new THREE.Vector3(1.1, TABLE_SURFACE.CARD_REST_Y, -0.4);
    const velocity = new THREE.Vector3(0.2, 0, -0.1);
    const dropInfo = createDropInfoForPlay({
      dropPosition,
      velocity,
      isSlowDrop: true,
    });

    expect(dropInfo.dropPosition).not.toBe(dropPosition);
    expect(dropInfo.velocity).not.toBe(velocity);
    expect(dropInfo.startPosition.x).toBe(dropPosition.x);
    expect(dropInfo.startPosition.y).toBe(DRAG_CONFIG.DRAG_PLANE_Y);
    expect(dropInfo.startPosition.z).toBe(dropPosition.z);
  });
});

describe('calculateVelocityFromSamples', () => {
  const y = DRAG_CONFIG.DRAG_PLANE_Y;

  it('measures the throw from the oldest to the newest sample in units per second', () => {
    const velocity = calculateVelocityFromSamples([
      { position: new THREE.Vector3(0, y, 2), timestamp: 1000 },
      { position: new THREE.Vector3(0.1, y, 1.9), timestamp: 1050 },
      { position: new THREE.Vector3(0.3, y, 1.5), timestamp: 1100 },
    ]);

    // 0.3 right and 0.5 toward the table centre in 100 ms
    expect(velocity.x).toBeCloseTo(3);
    expect(velocity.y).toBeCloseTo(0);
    expect(velocity.z).toBeCloseTo(-5);
  });

  it.each([
    { gesture: 'a single sample', samples: [{ position: new THREE.Vector3(0, y, 2), timestamp: 1000 }] },
    {
      gesture: 'two samples within a millisecond',
      samples: [
        { position: new THREE.Vector3(0, y, 2), timestamp: 1000 },
        { position: new THREE.Vector3(0, y, 1.9), timestamp: 1000.5 },
      ],
    },
  ])('reads $gesture as no throw instead of a huge or undefined speed', ({ samples }) => {
    expect(calculateVelocityFromSamples(samples).toArray()).toEqual([0, 0, 0]);
  });
});

describe('constrainToCollisionBoundary', () => {
  // Played cards rest at 90% size (PhysicsPlayedCard); at any yaw a corner reaches half the diagonal out
  const playedCardHalfDiagonal = Math.hypot(CARD_DIMENSIONS.WIDTH * 0.9, CARD_DIMENSIONS.HEIGHT * 0.9) / 2;
  const pickup = new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 2.3);

  it.each([
    { drop: 'on the trump indicator centre', position: new THREE.Vector3(0, DRAG_CONFIG.DRAG_PLANE_Y, 0) },
    { drop: 'overlapping the trump indicator', position: new THREE.Vector3(0.2, DRAG_CONFIG.DRAG_PLANE_Y, 0.3) },
  ])('pushes a card dropped $drop out until no corner can reach the indicator', ({ position }) => {
    const rest = constrainToCollisionBoundary(position, pickup);

    expect(Math.hypot(rest.x, rest.z) - playedCardHalfDiagonal).toBeGreaterThanOrEqual(TRUMP_ZONE_PHYSICS.HARD_RADIUS);
    // Pushed out along its own direction, or toward the pickup side when dropped dead centre
    const direction = position.x === 0 && position.z === 0 ? pickup : position;
    expect(Math.atan2(rest.x, rest.z)).toBeCloseTo(Math.atan2(direction.x, direction.z), 9);
    expect(rest.y).toBe(TABLE_SURFACE.CARD_REST_Y);
  });

  it('leaves a card dropped clear of the indicator where it was, resting on the felt', () => {
    const rest = constrainToCollisionBoundary(new THREE.Vector3(1.4, DRAG_CONFIG.DRAG_PLANE_Y, -0.9), pickup);

    expect([rest.x, rest.y, rest.z]).toEqual([1.4, TABLE_SURFACE.CARD_REST_Y, -0.9]);
  });
});
