import { CARD_TRAIL } from '../../config/collection-animation.config';

/** Absorbs float error when a frame lasts exactly one sample interval */
const SAMPLE_STEP_EPSILON = 1e-6;

/**
 * Ring of trail samples, newest first, taken at a fixed time step.
 * `positions` holds xyz triplets and doubles as the trail geometry's position buffer;
 * only the first `filled` samples are real and should be drawn.
 */
export interface CardTrailHistory {
  readonly positions: Float32Array;
  readonly capacity: number;
  filled: number;
  lastSampleTime: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

export function createCardTrailHistory(capacity: number): CardTrailHistory {
  const safeCapacity = Math.max(0, Math.floor(capacity));
  return {
    positions: new Float32Array(safeCapacity * 3),
    capacity: safeCapacity,
    filled: 0,
    lastSampleTime: 0,
  };
}

/** Forget every sample, so a re-activated trail does not draw a stale path. */
export function resetCardTrailHistory(history: CardTrailHistory): void {
  history.filled = 0;
}

function pushSample(history: CardTrailHistory, x: number, y: number, z: number): void {
  history.positions.copyWithin(3, 0, (history.capacity - 1) * 3);
  history.positions[0] = x;
  history.positions[1] = y;
  history.positions[2] = z;
  history.filled = Math.min(history.filled + 1, history.capacity);
}

/**
 * Records the target position at `time`. One sample is stored per elapsed interval, whatever the
 * frame rate: fast frames between samples store nothing, and a long frame stores several samples
 * interpolated between the last sample and the current position.
 * Returns whether the stored samples changed.
 */
export function advanceCardTrailHistory(
  history: CardTrailHistory,
  time: number,
  { x, y, z }: TrailPoint,
  sampleInterval: number = CARD_TRAIL.SAMPLE_INTERVAL_S
): boolean {
  if (history.capacity === 0) return false;

  const elapsed = time - history.lastSampleTime;
  const steps = Math.floor(elapsed / sampleInterval + SAMPLE_STEP_EPSILON);
  if (history.filled === 0 || steps > history.capacity) {
    resetCardTrailHistory(history);
    pushSample(history, x, y, z);
    history.lastSampleTime = time;
    return true;
  }

  if (steps <= 0) return false;

  const fromX = history.positions[0];
  const fromY = history.positions[1];
  const fromZ = history.positions[2];
  for (let step = 1; step <= steps; step++) {
    const progress = Math.min(1, (step * sampleInterval) / elapsed);
    pushSample(
      history,
      fromX + (x - fromX) * progress,
      fromY + (y - fromY) * progress,
      fromZ + (z - fromZ) * progress
    );
  }
  history.lastSampleTime += steps * sampleInterval;
  return true;
}
