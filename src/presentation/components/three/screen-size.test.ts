import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENE_LABEL } from '@/presentation/config/scene-label.config';
import { getPixelsPerWorldUnit, getScreenConstantScale } from './screen-size';

describe('getPixelsPerWorldUnit', () => {
  it('matches a three.js projection of a camera-facing segment', () => {
    const camera = new THREE.PerspectiveCamera(58, 390 / 844, 0.1, 100);
    camera.zoom = 0.9;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const depth = 12.6;
    const top = new THREE.Vector3(0, 0.5, -depth).project(camera);
    const bottom = new THREE.Vector3(0, -0.5, -depth).project(camera);
    const projectedPx = ((top.y - bottom.y) / 2) * 844;
    expect(getPixelsPerWorldUnit({ depth, fovDeg: 58, zoom: 0.9, viewportHeightPx: 844 })).toBeCloseTo(projectedPx, 6);
  });

  it('is infinite behind the camera', () => {
    expect(getPixelsPerWorldUnit({ depth: -1, fovDeg: 58, zoom: 1, viewportHeightPx: 844 })).toBe(Infinity);
  });
});

describe('getScreenConstantScale', () => {
  const capHeight = SCENE_LABEL.FONT_SIZE * SCENE_LABEL.CAP_HEIGHT_RATIO;

  it.each([
    ['phone portrait pulled back', 12.6, 58, 844],
    ['small phone', 10.3, 58, 568],
    ['laptop', 8.4, 50, 768],
    ['4K', 8.4, 50, 2160],
  ])('keeps seat labels at their target cap height on %s', (_name, depth, fovDeg, viewportHeightPx) => {
    const scale = getScreenConstantScale({ worldHeight: capHeight, targetPx: SCENE_LABEL.SEAT.CAP_PX, depth, fovDeg, zoom: 1, viewportHeightPx });
    const onScreen = capHeight * scale * getPixelsPerWorldUnit({ depth, fovDeg, zoom: 1, viewportHeightPx });
    expect(onScreen).toBeCloseTo(SCENE_LABEL.SEAT.CAP_PX, 6);
    expect(onScreen).toBeGreaterThanOrEqual(11);
  });

  it('falls back to 1 for a degenerate projection', () => {
    expect(getScreenConstantScale({ worldHeight: 0.07, targetPx: 12, depth: 0, fovDeg: 50, zoom: 1, viewportHeightPx: 768 })).toBe(1);
  });
});
