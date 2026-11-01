import type { Particle, Rng, Viewport } from '../particle';
import type { Behaviour, LayerRuntime, StepEnv } from '../types';
import { MARGIN, rollCommon, spreadX, spreadY, twinkleAlpha, wrapX } from './shared';

/** Spatial frequency of the shared turbulence field (rad/px), so neighbours eddy together. */
const FIELD_FREQ_Y = 0.011;
const FIELD_FREQ_T = 0.6;
const FIELD_DEPTH = 0.35;
/** Second, faster sway harmonic for turbulence. */
const HARMONIC_RATIO = 2.7;
const HARMONIC_DEPTH = 0.45;
/** Smallest |scaleX| while tumbling, so an edge-on leaf stays a sliver instead of vanishing. */
const MIN_TUMBLE_SCALE = 0.08;
/** Swing tilt of a fluttering leaf (rad). */
const SWING_TILT = 0.55;
/** Loop-the-loop angular speed during gusts (rad/s). */
const SWIRL_SPEED = 2.4;

function enterFromTop(p: Particle, view: Viewport, rng: Rng, initial: boolean): void {
  p.x = spreadX(view, rng);
  p.y = initial ? spreadY(view, rng) : -MARGIN - rng() * MARGIN;
}

/** Larger flakes of a layer fall a little faster than the small ones. */
function sizeSpeedFactor(p: Particle, layer: LayerRuntime): number {
  const [min, max] = layer.config.size;
  const t = max > min ? (p.size - min) / (max - min) : 0.5;
  return 0.85 + 0.3 * t;
}

/** Snow: slow fall, two-harmonic sway, a shared turbulence field, wind and twinkle. */
export const fallBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    p.vy *= sizeSpeedFactor(p, layer);
    enterFromTop(p, view, rng, initial);
  },
  step(p, layer, env: StepEnv) {
    const { dt, time, view } = env;
    const phi = time * p.freq + p.phase;
    const sway = p.amp * (Math.sin(phi) + HARMONIC_DEPTH * Math.sin(phi * HARMONIC_RATIO + p.phase));
    const field = p.amp * FIELD_DEPTH * Math.sin(p.y * FIELD_FREQ_Y + time * FIELD_FREQ_T);
    p.x += (p.vx + env.wind.value * layer.config.windFactor + sway + field) * dt;
    p.y += p.vy * (1 + 0.12 * Math.sin(phi * 0.7)) * dt;
    if (p.y > view.height + MARGIN) fallBehaviour.spawn(p, layer, env.rng, view, false);
    wrapX(p, view);
    p.drawAlpha = twinkleAlpha(p, time);
    p.sprite = p.base;
  },
};

/** Leaves and petals: pendulum swing, 3D tumble (scaleX flip), spin and gust swirls. */
export const flutterBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    enterFromTop(p, view, rng, initial);
  },
  step(p, layer, env: StepEnv) {
    const { dt, time, view, wind } = env;
    const c = layer.config;
    const phi = time * p.freq + p.phase;
    const swing = Math.cos(phi);
    // A pendulum falls fastest through the bottom of its arc and hangs at the extremes.
    const fall = p.vy * (0.55 + 0.75 * Math.abs(swing));
    const swirl = (c.swirl ?? 0) * wind.gust;
    const loop = time * SWIRL_SPEED + p.phase;
    p.x += (p.vx + wind.value * c.windFactor + p.amp * swing - Math.sin(loop) * swirl) * dt;
    p.y += (fall + Math.cos(loop) * swirl) * dt;
    p.rot += (p.spin * (1 + wind.gust)) * dt;
    p.angle = p.rot + SWING_TILT * Math.sin(phi);
    const flip = Math.cos(time * p.tumble + p.phase * 1.7);
    const magnitude = Math.max(MIN_TUMBLE_SCALE, Math.abs(flip));
    p.scaleX = flip < 0 ? -magnitude : magnitude;
    p.scaleY = 1;
    // The back of a tumbling leaf catches less light.
    p.drawAlpha = p.alpha * (0.7 + 0.3 * Math.abs(flip));
    p.sprite = p.base;
    if (p.y > view.height + MARGIN) flutterBehaviour.spawn(p, layer, env.rng, view, false);
    wrapX(p, view);
  },
};
