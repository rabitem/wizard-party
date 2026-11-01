import type { AmbientWindConfig } from '@/presentation/config/seasonal-ambience.config';
import { pick, type Rng } from './particle';

/** Slow breathing of the base wind so a calm field never looks mechanically uniform. */
const BASE_BREATH_FREQ = 0.13;
const BASE_BREATH_DEPTH = 0.35;

/** Mutable wind state for one pack. `value` (px/s) is what behaviours read. */
export interface WindState {
  value: number;
  /** 0..1 envelope of the current gust (petal swirl reads it). */
  gust: number;
  time: number;
  /** Seconds into the current gust or pause. */
  elapsed: number;
  /** Length of the current gust or pause. */
  span: number;
  gusting: boolean;
  /** Signed peak of the current gust. */
  peak: number;
}

export function createWind(config: AmbientWindConfig, rng: Rng): WindState {
  return {
    value: config.base,
    gust: 0,
    time: 0,
    // Start part-way into the first pause so the first gust arrives sooner.
    elapsed: 0,
    span: pick(config.gustEvery, rng) * rng(),
    gusting: false,
    peak: 0,
  };
}

/** Gusts mostly follow the base direction; on a calm base they pick a side at random. */
function gustDirection(config: AmbientWindConfig, rng: Rng): number {
  if (config.base === 0) return rng() < 0.5 ? -1 : 1;
  const sign = Math.sign(config.base);
  return rng() < 0.85 ? sign : -sign;
}

/** Advance the wind by dt seconds (mutates state, no allocations). */
export function stepWind(state: WindState, config: AmbientWindConfig, rng: Rng, dt: number): void {
  state.time += dt;
  state.elapsed += dt;
  if (state.elapsed >= state.span) {
    state.elapsed = 0;
    state.gusting = !state.gusting && config.gustStrength > 0;
    if (state.gusting) {
      state.span = pick(config.gustDuration, rng);
      state.peak = config.gustStrength * (0.6 + 0.4 * rng()) * gustDirection(config, rng);
    } else {
      state.span = pick(config.gustEvery, rng);
    }
  }
  const envelope = state.gusting ? Math.sin((Math.PI * state.elapsed) / state.span) ** 2 : 0;
  state.gust = envelope;
  const breath = 1 + BASE_BREATH_DEPTH * Math.sin(state.time * BASE_BREATH_FREQ * Math.PI * 2);
  state.value = config.base * breath + state.peak * envelope;
}
