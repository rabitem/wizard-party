import { describe, expect, it } from 'vitest';
import { TABLE_SHAKE } from '@/presentation/config/animation.config';
import { settleShakeAngle } from './table-shake';

describe('settleShakeAngle', () => {
  it('should decay the same amount per second at 120 Hz as at 60 Hz', () => {
    let at60 = 0.004;
    let at120 = 0.004;
    for (let i = 0; i < 6; i++) at60 = settleShakeAngle(at60, 1 / 60);
    for (let i = 0; i < 12; i++) at120 = settleShakeAngle(at120, 1 / 120);
    expect(at120).toBeCloseTo(at60, 8);
  });

  it('should snap to exactly zero instead of decaying forever', () => {
    let angle = -TABLE_SHAKE.INTENSITY;
    for (let i = 0; i < 600 && angle !== 0; i++) angle = settleShakeAngle(angle, 1 / 60);
    expect(angle).toBe(0);
  });
});
