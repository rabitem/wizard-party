import type * as THREE from 'three';
import type { Rng } from '../land-fx-selection';

/**
 * One visual piece of a land effect (a particle burst, a ring, a billboard).
 * Layers allocate their GPU objects once on mount and are re-armed with
 * reset() on every landing, so a drop never allocates.
 */
export interface LandFxLayer {
  readonly object: THREE.Object3D;
  /** Re-arm for a new landing; rand is seeded from the landing point. */
  reset(rand: Rng): void;
  /** t = seconds since landing, dt = clamped frame step. */
  update(t: number, dt: number): void;
  /** Free per-mount resources (shared textures / geometries stay alive). */
  dispose(): void;
}

export interface LandFxRecipe {
  /** Seconds until the effect hides and reports completion. */
  duration: number;
  createLayers(): LandFxLayer[];
}

/** Sorted (time, value) keys; values are linearly interpolated. */
export type Keyframes = ReadonlyArray<readonly [number, number]>;

export function sampleKeys(keys: Keyframes, t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const span = t1 - t0;
      return span > 0 ? v0 + ((t - t0) / span) * (v1 - v0) : v1;
    }
  }
  return keys[keys.length - 1][1];
}
