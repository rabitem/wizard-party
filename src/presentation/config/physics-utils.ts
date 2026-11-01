/**
 * Physics utility functions: spring forces, interpolation, easing, and randomization.
 * Part of the physics configuration module system.
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export interface SpringForceParams {
  current: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;
  dt: number;
}

export function springForce(params: SpringForceParams): { value: number; velocity: number } {
  const { current, target, velocity, stiffness, damping, dt } = params;
  const force = (target - current) * stiffness;
  const newVelocity = (velocity + force * dt) * Math.pow(0.5, damping * dt);
  const newValue = current + newVelocity * dt;
  return { value: newValue, velocity: newVelocity };
}

const REFERENCE_FPS = 60;

/**
 * Lerp factor for a frame of length dt (seconds) that matches `rate60` applied once per
 * 60 fps frame, so smoothing settles in the same time at any refresh rate.
 */
export function frameLerp(rate60: number, dt: number): number {
  return 1 - Math.pow(1 - rate60, dt * REFERENCE_FPS);
}

/** Multiplicative decay for a frame of length dt that matches `factor60` per 60 fps frame. */
export function frameDecay(factor60: number, dt: number): number {
  return Math.pow(factor60, dt * REFERENCE_FPS);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Seeded PRNG for deterministic randomness per card */
export function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return () => {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function clampRandomForLog(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return clamp(value, Number.EPSILON, 1 - Number.EPSILON);
}

/** Box-Muller transform for normal distribution */
export function gaussianRandom(rand: () => number, mean: number, stdDev: number): number {
  const u1 = clampRandomForLog(rand());
  const u2 = clamp(rand(), 0, 1);
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}
