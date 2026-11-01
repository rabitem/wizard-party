import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { CAMERA_CONFIG, HAND_CONFIG } from '../config/layout.config';
import { CARD_DIMENSIONS } from '../config/card-physics';
import {
  calcCardPositions,
  calcHandLayout,
  getPreferredCardScale,
  splitHandRows,
  type HandLayoutResult,
} from './PlayerHand.fit';
import { getCardAnimOffset } from './PlayerHand.layout';

interface Viewport { name: string; width: number; height: number; fov: number; coarse: boolean }

const VIEWPORTS: Viewport[] = [
  { name: 'small phone portrait', width: 320, height: 568, fov: CAMERA_CONFIG.MOBILE.FOV, coarse: true },
  { name: 'phone portrait', width: 390, height: 844, fov: CAMERA_CONFIG.MOBILE.FOV, coarse: true },
  { name: 'iPhone 14 short portrait', width: 390, height: 664, fov: CAMERA_CONFIG.MOBILE.FOV, coarse: true },
  { name: 'phone landscape', width: 844, height: 390, fov: CAMERA_CONFIG.MOBILE.FOV, coarse: true },
  { name: 'tablet portrait', width: 820, height: 1180, fov: CAMERA_CONFIG.DESKTOP.FOV, coarse: true },
  { name: 'tablet landscape', width: 1180, height: 820, fov: CAMERA_CONFIG.DESKTOP.FOV, coarse: true },
  { name: 'laptop', width: 1366, height: 768, fov: CAMERA_CONFIG.DESKTOP.FOV, coarse: false },
  { name: '4K', width: 3840, height: 2160, fov: CAMERA_CONFIG.DESKTOP.FOV, coarse: false },
];

/** Largest hands: 60 cards over 3-6 players, plus one for expansion effects that add a card */
const MAX_HANDS = [21, 15, 12, 10];

function cameraFor(viewport: Viewport): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(viewport.fov, viewport.width / viewport.height, 0.1, 100);
  camera.updateMatrixWorld();
  return camera;
}

interface HandProjection { left: number; right: number; minStrip: number }

/** Projects every card's corners the way CameraRelativeHand places the hand (independent of the solver) */
function projectHand(viewport: Viewport, cardCount: number, layout: HandLayoutResult): HandProjection {
  const camera = cameraFor(viewport);
  const isPortrait = viewport.width / viewport.height < HAND_CONFIG.PORTRAIT_MAX_ASPECT;
  const hand = new THREE.Group();
  hand.position.set(0, isPortrait ? HAND_CONFIG.VERTICAL_OFFSET.PORTRAIT : HAND_CONFIG.VERTICAL_OFFSET.LANDSCAPE, -HAND_CONFIG.DISTANCE_FROM_CAMERA);
  const halfW = CARD_DIMENSIONS.WIDTH / 2;
  const halfH = CARD_DIMENSIONS.HEIGHT / 2;
  const toPx = (ndc: number) => ((ndc + 1) / 2) * viewport.width;
  let left = Infinity, right = -Infinity;
  const centresPx: number[] = [];

  for (const { pos, rot } of calcCardPositions(cardCount, layout)) {
    const card = new THREE.Group();
    card.position.set(...pos);
    card.rotation.set(...rot);
    card.scale.setScalar(layout.cardScale);
    hand.add(card);
    hand.updateMatrixWorld(true);
    for (const [x, y] of [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]]) {
      const projected = card.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
      left = Math.min(left, toPx(projected.x));
      right = Math.max(right, toPx(projected.x));
    }
    centresPx.push(toPx(card.localToWorld(new THREE.Vector3()).project(camera).x));
  }

  const perRowStrips: number[] = [];
  let start = 0;
  for (const size of splitHandRows(cardCount, layout.rows)) {
    for (let i = start + 1; i < start + size; i++) perRowStrips.push(centresPx[i] - centresPx[i - 1]);
    start += size;
  }
  return { left, right, minStrip: perRowStrips.length ? Math.min(...perRowStrips) : Infinity };
}

describe('calcHandLayout fit', () => {
  for (const viewport of VIEWPORTS) {
    for (const cardCount of MAX_HANDS) {
      it(`keeps ${cardCount} cards on screen with tappable strips on ${viewport.name}`, () => {
        const layout = calcHandLayout(cardCount, cameraFor(viewport), viewport.width, viewport.height, { coarsePointer: viewport.coarse });
        const { left, right, minStrip } = projectHand(viewport, cardCount, layout);

        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(viewport.width);
        const minStripPx = viewport.coarse ? HAND_CONFIG.LAYOUT.MIN_STRIP_PX.COARSE : HAND_CONFIG.LAYOUT.MIN_STRIP_PX.FINE;
        expect(minStrip).toBeGreaterThanOrEqual(minStripPx - 0.5);
      });
    }
  }

  it('uses a single row for ordinary hands', () => {
    for (const viewport of VIEWPORTS) {
      expect(calcHandLayout(6, cameraFor(viewport), viewport.width, viewport.height, { coarsePointer: viewport.coarse }).rows).toBe(1);
    }
  });

  it('splits a 20-card hand into rows on a portrait phone instead of shrinking it to slivers', () => {
    const phone = VIEWPORTS[1];
    const layout = calcHandLayout(20, cameraFor(phone), phone.width, phone.height, { coarsePointer: true });
    expect(layout.rows).toBeGreaterThan(1);
    expect(layout.cardScale).toBeGreaterThanOrEqual(getPreferredCardScale(20, true) * HAND_CONFIG.LAYOUT.MIN_SCALE_RATIO);
  });

  it('changes the preferred card size continuously with the card count (no cliff at 6 cards)', () => {
    for (let count = 1; count < 20; count++) {
      const drop = getPreferredCardScale(count, true) - getPreferredCardScale(count + 1, true);
      expect(drop).toBeLessThanOrEqual(0.03);
    }
  });

  it('stacks rows back to front in hand order, later cards nearer the camera', () => {
    const phone = VIEWPORTS[1];
    const layout = calcHandLayout(20, cameraFor(phone), phone.width, phone.height, { coarsePointer: true });
    const positions = calcCardPositions(20, layout);
    for (let i = 1; i < positions.length; i++) expect(positions[i].pos[2]).toBeGreaterThan(positions[i - 1].pos[2]);
    expect(positions[0].pos[1]).toBeGreaterThan(positions[positions.length - 1].pos[1]);
  });
});

describe('splitHandRows', () => {
  it('puts the extra cards in the back rows', () => {
    expect(splitHandRows(15, 2)).toEqual([8, 7]);
    expect(splitHandRows(20, 3)).toEqual([7, 7, 6]);
    expect(splitHandRows(3, 5)).toEqual([1, 1, 1]);
  });
});

describe('PlayerHand dense hand animation layout', () => {
  const mobile = VIEWPORTS[1];
  const mobileCamera = cameraFor(mobile);
  const desktopCamera = new THREE.PerspectiveCamera(CAMERA_CONFIG.DESKTOP.FOV, 1280 / 720, 0.1, 100);

  it('keeps desktop hands above five cards wide enough to read card faces', () => {
    const layout = calcHandLayout(7, desktopCamera, 1280, 720);

    expect(layout.cardSpacing).toBeGreaterThanOrEqual(layout.cardScale * 0.6);
  });

  it('keeps the corner index of every overlapped mobile card visible', () => {
    // The classic corner badge covers about a third of the card width
    const CORNER_INDEX_WIDTH = 0.33;
    for (const count of [7, 10, 15, 20]) {
      const layout = calcHandLayout(count, mobileCamera, mobile.width, mobile.height, { coarsePointer: true });
      expect(layout.cardSpacing).toBeGreaterThanOrEqual(CARD_DIMENSIONS.WIDTH * layout.cardScale * CORNER_INDEX_WIDTH);
    }
  });

  it('caps sort lift so hands above five cards stay readable on mobile', () => {
    const layout = calcHandLayout(8, mobileCamera, mobile.width, mobile.height, { coarsePointer: true });

    const offsetAtWavePeak = getCardAnimOffset({
      index: 0,
      cardId: 'wizard-1',
      animation: 'sort',
      progress: 0.16,
      cardCount: 8,
      layout,
    });

    expect(offsetAtWavePeak.y).toBeLessThanOrEqual(layout.cardScale * 0.55);
  });

  it('caps shuffle slide against compressed card spacing', () => {
    const layout = calcHandLayout(8, mobileCamera, mobile.width, mobile.height, { coarsePointer: true });

    const offsetAtSlidePeak = getCardAnimOffset({
      index: 1,
      cardId: 'jester-1',
      animation: 'shuffle',
      progress: 0.125,
      cardCount: 8,
      layout,
    });

    expect(Math.abs(offsetAtSlidePeak.x)).toBeLessThanOrEqual(layout.cardSpacing * 0.85);
    expect(offsetAtSlidePeak.y).toBeLessThanOrEqual(layout.cardScale * 0.32);
  });
});
