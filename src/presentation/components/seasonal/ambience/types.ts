import type { AmbientLayerConfig } from '@/presentation/config/seasonal-ambience.config';
import type { Particle, Rng, Viewport } from './particle';
import type { WindState } from './wind';

/** Static facts about a layer the behaviours need (sprite layout, config). */
export interface LayerRuntime {
  config: AmbientLayerConfig;
  /** Distinct base sprites (colors x silhouettes). */
  variants: number;
  /** Animation frames per base sprite (bats); 1 otherwise. */
  frames: number;
}

/** Per-frame environment shared by every particle step. Mutated in place by the engine. */
export interface StepEnv {
  view: Viewport;
  /** Seconds since the engine started. */
  time: number;
  /** Seconds since the previous frame (0 for a static render). */
  dt: number;
  wind: WindState;
  rng: Rng;
}

/**
 * Motion model for one behaviour. spawn() (re)initialises a pooled particle; `initial` places it
 * anywhere on screen so the scene starts populated, otherwise it enters from an edge. step()
 * advances it and writes the draw fields. Neither may allocate.
 */
export interface Behaviour {
  spawn(p: Particle, layer: LayerRuntime, rng: Rng, view: Viewport, initial: boolean): void;
  step(p: Particle, layer: LayerRuntime, env: StepEnv): void;
}
