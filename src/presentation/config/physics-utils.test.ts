import { describe, expect, it } from 'vitest';
import { frameDecay, frameLerp, gaussianRandom } from './physics-utils';

describe('frameLerp', () => {
  it('matches the per-frame rate exactly at 60 fps', () => {
    expect(frameLerp(0.18, 1 / 60)).toBeCloseTo(0.18, 10);
  });

  it('closes the same share of a gap per second at 30, 60 and 120 fps', () => {
    const remainingAfterOneSecond = (fps: number) => {
      let value = 1;
      for (let frame = 0; frame < fps; frame++) value -= value * frameLerp(0.18, 1 / fps);
      return value;
    };

    expect(remainingAfterOneSecond(30)).toBeCloseTo(remainingAfterOneSecond(60), 10);
    expect(remainingAfterOneSecond(120)).toBeCloseTo(remainingAfterOneSecond(60), 10);
  });

  it('stays below 1 for the clamped long frame', () => {
    expect(frameLerp(0.75, 0.05)).toBeLessThan(1);
  });
});

describe('frameDecay', () => {
  it('matches the per-frame factor at 60 fps and compounds over longer frames', () => {
    expect(frameDecay(0.85, 1 / 60)).toBeCloseTo(0.85, 10);
    expect(frameDecay(0.85, 2 / 60)).toBeCloseTo(0.85 * 0.85, 10);
  });
});

describe('gaussianRandom', () => {
  it('returns a finite value when the random source returns zero', () => {
    const value = gaussianRandom(() => 0, 0, 0.2);

    expect(Number.isFinite(value)).toBe(true);
  });
});
