import { describe, expect, it } from 'vitest';
import {
  coverFraction,
  intersection,
  ndcToClientRect,
  outsideFraction,
  overlaps,
  unionRect,
  type ScreenRect,
} from './screen-geometry';

const rect = (left: number, top: number, right: number, bottom: number): ScreenRect => ({ left, top, right, bottom });

describe('screen geometry', () => {
  it('should intersect rectangles and ignore borders that only touch', () => {
    expect(intersection(rect(0, 0, 10, 10), rect(5, 5, 20, 20))).toEqual(rect(5, 5, 10, 10));
    expect(intersection(rect(0, 0, 10, 10), rect(10, 0, 20, 10))).toBeNull();
    expect(overlaps(rect(0, 0, 10, 10), rect(9, 0, 20, 10), 2)).toBe(false);
    expect(overlaps(rect(0, 0, 10, 10), rect(5, 5, 20, 20), 2)).toBe(true);
  });

  it('should report the share of a target a cover hides', () => {
    expect(coverFraction(rect(0, 0, 10, 10), rect(0, 0, 5, 10))).toBe(0.5);
    expect(coverFraction(rect(0, 0, 10, 10), rect(20, 20, 30, 30))).toBe(0);
    expect(coverFraction(rect(0, 0, 0, 10), rect(0, 0, 10, 10))).toBe(0);
  });

  it('should union rectangles', () => {
    expect(unionRect([rect(0, 0, 5, 5), rect(10, 10, 20, 15)])).toEqual(rect(0, 0, 20, 15));
    expect(unionRect([])).toBeNull();
  });

  it('should map normalised device coordinates onto the canvas with y pointing down', () => {
    const canvas = rect(100, 50, 500, 350);
    expect(ndcToClientRect({ minX: -1, maxX: 1, minY: -1, maxY: 1 }, canvas)).toEqual(canvas);
    expect(ndcToClientRect({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, canvas)).toEqual(rect(300, 50, 500, 200));
  });

  it('should measure how much of a rectangle lies outside the viewport', () => {
    const viewport = { width: 100, height: 100 };
    expect(outsideFraction(rect(10, 10, 20, 20), viewport)).toBe(0);
    expect(outsideFraction(rect(90, 0, 110, 10), viewport)).toBe(0.5);
    expect(outsideFraction(rect(200, 200, 210, 210), viewport)).toBe(1);
  });
});
