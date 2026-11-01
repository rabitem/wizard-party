import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA_CONFIG } from '@/presentation/config/layout.config';
import { CAMERA_ENVELOPE, getCameraEnvelope } from '@/presentation/config/themed-environment.config';
import { frameCamera, getEnvelopeClampScale } from './camera-framing';
import { getCameraRelativeHandPlacement } from './CameraRelativeHand';
import { getHalfWidthFitPoints, getTableFitPoints } from './table-fit-points';

const { DESKTOP, MOBILE, TARGET, FIT_HALF_WIDTH } = CAMERA_CONFIG;
const DEG = Math.PI / 180;
/** The worst-case strip the framing used before it knew the table size */
const FIT_POINTS = getHalfWidthFitPoints(FIT_HALF_WIDTH);

function visibleHalfWidth(distance: number, fovDeg: number, aspect: number, zoom = 1): number {
  return (distance * Math.tan((fovDeg * DEG) / 2) * aspect) / zoom;
}

function directionFromTarget(position: readonly number[], target: readonly number[] = TARGET): number[] {
  const offset = position.map((value, i) => value - target[i]);
  const length = Math.hypot(...offset);
  return offset.map((value) => value / length);
}

/** Phones (portrait/landscape), tablets, laptop */
const ASPECTS = [0.43, 0.45, 390 / 844, 320 / 568, 390 / 664, 820 / 1180, 844 / 390, 1366 / 768];
const ROOMS = [...Object.keys(CAMERA_ENVELOPE.OVERHEAD_Y), 'default'];

describe('frameCamera', () => {
  it('keeps the preset position on landscape viewports', () => {
    const fitted = frameCamera({ presetPosition: DESKTOP.POSITION, target: TARGET, fovDeg: DESKTOP.FOV, aspect: 1366 / 768, fitPoints: FIT_POINTS });
    expect(fitted.position).toEqual(DESKTOP.POSITION);
    expect(fitted.zoom).toBe(1);
  });

  it('pulls a portrait tablet back until the side seats fit', () => {
    const aspect = 820 / 1180;
    const fitted = frameCamera({ presetPosition: DESKTOP.POSITION, target: TARGET, fovDeg: DESKTOP.FOV, aspect, fitPoints: FIT_POINTS });
    expect(visibleHalfWidth(fitted.distance, DESKTOP.FOV, aspect)).toBeCloseTo(FIT_HALF_WIDTH, 6);
    expect(fitted.distance).toBeGreaterThan(Math.hypot(...DESKTOP.POSITION.map((v, i) => v - TARGET[i])));
  });

  it('moves along the preset view direction when the room allows it', () => {
    const fitted = frameCamera({ presetPosition: MOBILE.POSITION, target: TARGET, fovDeg: MOBILE.FOV, aspect: 0.5, fitPoints: FIT_POINTS });
    const preset = directionFromTarget(MOBILE.POSITION);
    const moved = directionFromTarget(fitted.position);
    moved.forEach((value, i) => expect(value).toBeCloseTo(preset[i], 9));
  });

  it('ignores an unmeasured viewport', () => {
    for (const aspect of [Number.NaN, Infinity]) {
      expect(frameCamera({ presetPosition: DESKTOP.POSITION, target: TARGET, fovDeg: DESKTOP.FOV, aspect, fitPoints: FIT_POINTS }).position)
        .toEqual(DESKTOP.POSITION);
    }
  });

  describe.each(ROOMS)('in the %s room', (room) => {
    const envelope = getCameraEnvelope(room);

    it.each(ASPECTS)('stays under the overhead geometry and still fits the table at aspect %f', (aspect) => {
      for (const preset of [MOBILE, DESKTOP]) {
        const fitted = frameCamera({ presetPosition: preset.POSITION, target: TARGET, fovDeg: preset.FOV, aspect, fitPoints: FIT_POINTS, envelope });
        const [, y] = fitted.position;
        expect(y).toBeLessThanOrEqual(envelope.maxHeight + 1e-9);
        expect(visibleHalfWidth(fitted.distance, preset.FOV, aspect, fitted.zoom)).toBeGreaterThanOrEqual(FIT_HALF_WIDTH - 1e-6);
        // The top edge of the view points down, so nothing above the camera is in the picture
        const elevation = Math.asin(directionFromTarget(fitted.position, fitted.target)[1]) / DEG;
        const effectiveHalfFov = Math.atan(Math.tan((preset.FOV * DEG) / 2) / fitted.zoom) / DEG;
        expect(elevation).toBeGreaterThanOrEqual(effectiveHalfFov - 1e-6);
        expect(fitted.zoom).toBeLessThanOrEqual(1);
        // Inside the walls, so the orbit clamp never pulls the framed camera in (and unfits it)
        expect(Math.hypot(fitted.position[0], fitted.position[2])).toBeLessThanOrEqual(envelope.maxHorizontalRadius + 1e-9);
        expect(getEnvelopeClampScale(fitted.position, fitted.target, envelope)).toBeGreaterThan(1 - 1e-9);
      }
    });
  });

  it('frames the table centre at the requested height of the screen', () => {
    const aspect = 390 / 844;
    const fitted = frameCamera({
      presetPosition: MOBILE.POSITION, target: TARGET, fovDeg: MOBILE.FOV, aspect, fitPoints: FIT_POINTS,
      envelope: getCameraEnvelope('halloween'), tableCenterNdcY: 0.17,
    });
    const camera = new THREE.PerspectiveCamera(MOBILE.FOV, aspect, 0.1, 100);
    camera.zoom = fitted.zoom;
    camera.position.set(...fitted.position);
    camera.lookAt(...fitted.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const center = new THREE.Vector3(...TARGET).project(camera);
    expect(center.y).toBeCloseTo(0.17, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(fitted.target[1]).toBe(TARGET[1]);
  });
});

/** Horizontal NDC of every seat plate corner for a framed camera */
function seatPlateNdcX(players: number, framing: ReturnType<typeof frameCamera>, fovDeg: number, aspect: number): number[] {
  const camera = new THREE.PerspectiveCamera(fovDeg, aspect, 0.1, 100);
  camera.zoom = framing.zoom;
  camera.position.set(...framing.position);
  camera.lookAt(...framing.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return getTableFitPoints(players).map(([x, z]) => new THREE.Vector3(x, 0, z).project(camera).x);
}

describe('table fit', () => {
  const PORTRAIT_PHONE = 390 / 844;

  it.each([3, 4, 5, 6])('keeps every seat plate of a %i-seat table on a portrait phone, in every room', (players) => {
    for (const room of ROOMS) {
      for (const preset of [MOBILE, DESKTOP]) {
        const framing = frameCamera({
          presetPosition: preset.POSITION, target: TARGET, fovDeg: preset.FOV, aspect: PORTRAIT_PHONE,
          fitPoints: getTableFitPoints(players), envelope: getCameraEnvelope(room), tableCenterNdcY: 0.17,
        });
        for (const ndcX of seatPlateNdcX(players, framing, preset.FOV, PORTRAIT_PHONE)) {
          expect(Math.abs(ndcX)).toBeLessThanOrEqual(1 + 1e-6);
        }
      }
    }
  });

  it('frames three seats closer than four (side seats on the far half), five and six like four', () => {
    const distance = (players: number) => frameCamera({
      presetPosition: MOBILE.POSITION, target: TARGET, fovDeg: MOBILE.FOV, aspect: PORTRAIT_PHONE, fitPoints: getTableFitPoints(players),
    }).distance;
    expect(distance(3)).toBeLessThan(distance(4) * 0.9);
    // Near-half side seats are closer to the lens: perspective needs as much room as four seats
    expect(distance(5)).toBeGreaterThan(distance(4) * 0.97);
    expect(distance(6)).toBeGreaterThan(distance(4) * 0.95);
  });

  it('places the plate corners where PlayerBrandmark draws them (local seat at the near side)', () => {
    const { SEAT_RIM_RADIUS, SEAT_PLATE, SEAT_PADDING } = CAMERA_CONFIG.FRAMING;
    const points = getTableFitPoints(4);
    expect(points).toHaveLength(16);
    const nearest = Math.max(...points.map(([, z]) => z));
    expect(nearest).toBeCloseTo(SEAT_RIM_RADIUS + SEAT_PLATE.HALF_DEPTH + SEAT_PADDING, 9);
    const widest = Math.max(...points.map(([x]) => Math.abs(x)));
    expect(widest).toBeCloseTo(SEAT_RIM_RADIUS + SEAT_PLATE.HALF_DEPTH + SEAT_PADDING, 9);
  });

  it('falls back to the worst-case strip for an unknown table', () => {
    expect(getTableFitPoints(0)).toEqual(FIT_POINTS);
    expect(getTableFitPoints(Number.NaN)).toEqual(FIT_POINTS);
  });
});

describe('getEnvelopeClampScale', () => {
  it('stops a zoomed-out, tilted desktop orbit under the beams by moving along the view ray', () => {
    const envelope = getCameraEnvelope('halloween');
    const polar = CAMERA_CONFIG.MIN_POLAR_ANGLE;
    const distance = CAMERA_CONFIG.MAX_DISTANCE.DESKTOP;
    const position: [number, number, number] = [0, TARGET[1] + Math.cos(polar) * distance, Math.sin(polar) * distance];
    const scale = getEnvelopeClampScale(position, TARGET, envelope);
    expect(scale).toBeLessThan(1);
    expect(TARGET[1] + (position[1] - TARGET[1]) * scale).toBeCloseTo(envelope.maxHeight, 6);
  });

  it('leaves a camera inside the envelope alone', () => {
    expect(getEnvelopeClampScale(DESKTOP.POSITION, TARGET, getCameraEnvelope('winter'))).toBe(1);
  });
});

describe('getCameraRelativeHandPlacement', () => {
  it('keeps the hand the same on screen when the view is widened with zoom', () => {
    const plain = getCameraRelativeHandPlacement(0.5, 1);
    const widened = getCameraRelativeHandPlacement(0.5, 0.8);
    expect(widened.scale).toBeCloseTo(1.25, 9);
    expect(widened.verticalOffset).toBeCloseTo(plain.verticalOffset * 1.25, 9);
  });
});
