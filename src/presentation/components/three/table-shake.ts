import { TABLE_SHAKE } from '@/presentation/config/animation.config';

const REFERENCE_FRAME_SECONDS = 1 / 60;

/**
 * One frame of the table's return to rest after a shake: the same decay per 1/60 s at any frame
 * rate, and exactly 0 once the angle is imperceptible, so the table stops moving.
 */
export function settleShakeAngle(angle: number, deltaSeconds: number): number {
  if (angle === 0) return 0;
  const settled = angle * TABLE_SHAKE.SETTLE_PER_60HZ_FRAME ** (Math.max(deltaSeconds, 0) / REFERENCE_FRAME_SECONDS);
  return Math.abs(settled) < TABLE_SHAKE.REST_EPSILON ? 0 : settled;
}
