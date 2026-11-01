import { describe, expect, it } from 'vitest';
import {
  advanceCardTrailHistory,
  createCardTrailHistory,
  resetCardTrailHistory,
  type CardTrailHistory,
} from './card-trail-history';

const INTERVAL = 1 / 60;

/** Follows a point moving along +X at `speed` for `duration` seconds at the given frame rate */
function recordFlight(history: CardTrailHistory, fps: number, duration: number, speed = 6): void {
  for (let frame = 0; frame * (1 / fps) <= duration + 1e-9; frame++) {
    const time = frame / fps;
    advanceCardTrailHistory(history, time, { x: time * speed, y: 0.3, z: 0 }, INTERVAL);
  }
}

function sample(history: CardTrailHistory, index: number): [number, number, number] {
  return [history.positions[index * 3], history.positions[index * 3 + 1], history.positions[index * 3 + 2]];
}

/** World distance from the newest to the oldest drawn sample */
function trailExtent(history: CardTrailHistory): number {
  const head = sample(history, 0);
  const tail = sample(history, history.filled - 1);
  return Math.hypot(head[0] - tail[0], head[1] - tail[1], head[2] - tail[2]);
}

describe('card trail history', () => {
  it('starts empty and records the first position immediately', () => {
    const history = createCardTrailHistory(10);

    expect(history.filled).toBe(0);
    expect(advanceCardTrailHistory(history, 2, { x: 1, y: 2, z: 3 }, INTERVAL)).toBe(true);
    expect(history.filled).toBe(1);
    expect(sample(history, 0)).toEqual([1, 2, 3]);
  });

  it('never grows past its capacity', () => {
    const history = createCardTrailHistory(5);
    recordFlight(history, 60, 1);

    expect(history.filled).toBe(5);
    expect(history.positions).toHaveLength(15);
  });

  it.each([30, 60, 120, 144])('covers the same stretch of path at %i Hz', (fps) => {
    const reference = createCardTrailHistory(10);
    recordFlight(reference, 60, 0.5);
    const history = createCardTrailHistory(10);
    recordFlight(history, fps, 0.5);

    expect(history.filled).toBe(10);
    // Ten samples one 60 Hz interval apart, whatever the refresh rate (within one sample interval)
    expect(Math.abs(trailExtent(history) - trailExtent(reference))).toBeLessThan(6 * INTERVAL + 1e-6);
  });

  it('interpolates evenly spaced samples across a long frame instead of repeating one point', () => {
    const history = createCardTrailHistory(10);
    advanceCardTrailHistory(history, 0, { x: 0, y: 0, z: 0 }, INTERVAL);
    advanceCardTrailHistory(history, 4 * INTERVAL, { x: 4, y: 0, z: 0 }, INTERVAL);

    expect(history.filled).toBe(5);
    expect([0, 1, 2, 3, 4].map((index) => sample(history, index)[0])).toEqual([4, 3, 2, 1, 0].map((x) => expect.closeTo(x, 6)));
  });

  it('skips frames that arrive faster than the sample interval', () => {
    const history = createCardTrailHistory(10);
    advanceCardTrailHistory(history, 0, { x: 0, y: 0, z: 0 }, INTERVAL);

    expect(advanceCardTrailHistory(history, INTERVAL / 2, { x: 1, y: 0, z: 0 }, INTERVAL)).toBe(false);
    expect(history.filled).toBe(1);
  });

  it('starts over after a gap longer than the whole trail', () => {
    const history = createCardTrailHistory(4);
    recordFlight(history, 60, 0.2);
    advanceCardTrailHistory(history, 10, { x: 50, y: 0, z: 0 }, INTERVAL);

    expect(history.filled).toBe(1);
    expect(sample(history, 0)).toEqual([50, 0, 0]);
  });

  it('forgets stale samples on reset', () => {
    const history = createCardTrailHistory(6);
    recordFlight(history, 60, 0.2);
    resetCardTrailHistory(history);
    advanceCardTrailHistory(history, 5, { x: 7, y: 0, z: 0 }, INTERVAL);

    expect(history.filled).toBe(1);
    expect(sample(history, 0)).toEqual([7, 0, 0]);
  });

  it('ignores an empty trail', () => {
    const history = createCardTrailHistory(0);

    expect(advanceCardTrailHistory(history, 1, { x: 1, y: 1, z: 1 }, INTERVAL)).toBe(false);
    expect(history.filled).toBe(0);
  });
});
