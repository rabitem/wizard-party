import { describe, expect, it } from 'vitest';
import { constrainToHorizontalBand, constrainToHorizontalRadius } from './physics-boundary';

describe('constrainToHorizontalRadius', () => {
  it('uses fallback direction when the point is exactly at center', () => {
    const result = constrainToHorizontalRadius(
      { x: 0, z: 0 },
      0.55,
      { x: -2, z: 0 }
    );

    expect(result).toEqual({ x: -0.55, z: 0 });
  });

  it('does not move points already outside the radius', () => {
    const result = constrainToHorizontalRadius({ x: 0.8, z: 0.1 }, 0.55);

    expect(result).toEqual({ x: 0.8, z: 0.1 });
  });
});

describe('constrainToHorizontalBand', () => {
  it('keeps played cards between center clearance and table edge clearance', () => {
    expect(constrainToHorizontalBand({ x: 0, z: 0 }, { minRadius: 0.5, maxRadius: 2 }, { x: -1, z: 0 }))
      .toEqual({ x: -0.5, z: 0 });

    const far = constrainToHorizontalBand({ x: 4, z: 0 }, { minRadius: 0.5, maxRadius: 2 });
    expect(far.x).toBeCloseTo(2);
    expect(far.z).toBeCloseTo(0);
  });
});
