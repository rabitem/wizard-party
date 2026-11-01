import type { Range } from '@/presentation/config/seasonal-ambience.config';

/** Uniform random number in [0, 1). */
export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) so tests and layouts are reproducible. */
export function createRandom(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (min: number, max: number, t: number): number => min + (max - min) * t;

export const pick = (range: Range, rng: Rng): number => lerp(range[0], range[1], rng());

/** Viewport size in CSS px. */
export interface Viewport {
  width: number;
  height: number;
}

/**
 * One mutable particle. Behaviours write the motion fields in step() and the draw fields
 * (drawAlpha, angle, scaleX, scaleY, sprite) the renderer reads. Pooled: never reallocated
 * inside the frame loop.
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** Phase offset for sway / pulse. */
  phase: number;
  /** Sway frequency (rad/s) and amplitude. */
  freq: number;
  amp: number;
  /** Rotation and its speed (rad, rad/s). */
  rot: number;
  spin: number;
  /** Tumble frequency (rad/s) for the scaleX flip. */
  tumble: number;
  /** Twinkle depth 0..1 and its frequency. */
  twinkle: number;
  twinkleFreq: number;
  /** Age and lifetime / wait for occasional particles (s). */
  life: number;
  ttl: number;
  /** Seconds until an occasional particle (bat, shooting star) appears. */
  wait: number;
  /** Direction flag for crossers (1 = left to right). */
  dir: number;
  /** Index into the layer's base sprite list (color x silhouette). */
  base: number;
  /** Draw outputs. */
  sprite: number;
  drawAlpha: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

export function createParticle(): Particle {
  return {
    x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 1, phase: 0, freq: 0, amp: 0, rot: 0, spin: 0, tumble: 0,
    twinkle: 0, twinkleFreq: 0, life: 0, ttl: 0, wait: 0, dir: 1, base: 0,
    sprite: 0, drawAlpha: 0, angle: 0, scaleX: 1, scaleY: 1,
  };
}
