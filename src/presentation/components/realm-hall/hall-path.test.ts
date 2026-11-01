import { describe, expect, it } from 'vitest';
import { REALM_HALL, hallStopsFor, type HallCameraStop } from '@/presentation/config/realm-hall.config';
import { cameraPoseAt, progressForScroll } from './hall-path';

const STOPS: HallCameraStop[] = [
  { position: [0, 0, 10], target: [0, 0, 0] },
  { position: [2, 0, 6], target: [4, 0, 6] },
  { position: [0, 4, 2], target: [0, 0, 0] },
];

describe('cameraPoseAt', () => {
  it.each([
    ['before the walk', -1, STOPS[0]],
    ['at a stop', 1, STOPS[1]],
    ['past the end', 9, STOPS[2]],
  ])('rests on a stop %s', (_, progress, stop) => {
    expect(cameraPoseAt(STOPS, progress)).toEqual(stop);
  });

  it('eases halfway between two stops to their midpoint', () => {
    expect(cameraPoseAt(STOPS, 0.5).position).toEqual([1, 0, 8]);
  });

  it('moves slower near a stop than mid-way, so the camera settles', () => {
    const nearStop = cameraPoseAt(STOPS, 0.1).position[0];
    const midway = cameraPoseAt(STOPS, 0.6).position[0] - cameraPoseAt(STOPS, 0.5).position[0];
    expect(nearStop).toBeLessThan(midway);
  });
});

describe('progressForScroll', () => {
  // Three stations, each one viewport (800px) tall.
  const stations = [0, 800, 1600].map((top) => ({ top, height: 800 }));

  it.each([
    ['at the top', 0, 0],
    ['halfway to the second station', 400, 0.5],
    ['at the second station', 800, 1],
    ['at the last station', 1600, 2],
    ['beyond the last station', 2400, 2],
  ])('is %s', (_, scrollY, progress) => {
    expect(progressForScroll(stations, scrollY, 800)).toBeCloseTo(progress);
  });

  it('stays at the door when there is only one station', () => {
    expect(progressForScroll([{ top: 0, height: 800 }], 500, 800)).toBe(0);
  });
});

describe('hallStopsFor', () => {
  it('uses the landscape path on wide screens', () => {
    expect(hallStopsFor(16 / 9)).toBe(REALM_HALL.STOPS);
  });

  it('swaps in the portrait stops on phones and keeps the rest', () => {
    const portrait = hallStopsFor(390 / 844);
    expect(portrait[1]).toEqual(REALM_HALL.PORTRAIT_STOPS[1]);
    expect(portrait.filter((stop, index) => index !== 1)).toEqual(REALM_HALL.STOPS.filter((stop, index) => index !== 1));
  });
});
