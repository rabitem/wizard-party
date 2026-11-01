import { pick, type Particle } from '../particle';
import type { Behaviour, LayerRuntime, StepEnv } from '../types';
import { MARGIN, TAU, bandY, rollCommon } from './shared';

const DEFAULT_INTERVAL = [6, 12] as const;
/** Bat bob and banking. */
const BAT_BOB_FREQ = 1.3;
const BAT_BANK = 0.12;
/** Shooting-star lifetime (s) and the share of it spent growing the tail. */
const SHOOT_TTL_MIN = 0.7;
const SHOOT_TTL_SPAN = 0.5;
const SHOOT_GROW = 0.4;

function hide(p: Particle): void {
  p.drawAlpha = 0;
}

/** Counts down a particle's wait; true while it should stay hidden. */
function waiting(p: Particle, dt: number): boolean {
  if (p.wait <= 0) return false;
  p.wait -= dt;
  hide(p);
  return true;
}

function scheduleNext(p: Particle, layer: LayerRuntime, rng: () => number, initial: boolean): void {
  const interval = pick(layer.config.interval ?? DEFAULT_INTERVAL, rng);
  // On first spawn spread the waits so crossers do not all appear together.
  p.wait = initial ? interval * rng() : interval;
  p.ttl = 0;
  p.life = 0;
}

/** Bats: wait, then cross the screen (either way) with flapping frames, a bob and a bank. */
export const batBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    scheduleNext(p, layer, rng, initial);
    p.dir = rng() < 0.5 ? -1 : 1;
    p.vx = Math.abs(p.vx) * p.dir;
    p.x = p.dir > 0 ? -p.size - MARGIN : view.width + p.size + MARGIN;
    p.y = bandY(layer, view, rng);
    hide(p);
  },
  step(p, layer, env: StepEnv) {
    const { dt, view } = env;
    if (waiting(p, dt)) return;
    p.life += dt;
    const bob = p.life * BAT_BOB_FREQ + p.phase;
    p.x += (p.vx + env.wind.value * layer.config.windFactor) * dt;
    p.y += (p.vy + p.amp * BAT_BOB_FREQ * Math.cos(bob)) * dt;
    const flap = ((p.life * p.freq + p.phase) / TAU) % 1;
    p.sprite = p.base * layer.frames + Math.min(layer.frames - 1, Math.floor(flap * layer.frames));
    p.scaleX = p.dir;
    p.scaleY = 1;
    p.angle = BAT_BANK * Math.sin(bob);
    p.drawAlpha = p.alpha;
    const gone = p.dir > 0 ? p.x > view.width + p.size + MARGIN : p.x < -p.size - MARGIN;
    if (gone) batBehaviour.spawn(p, layer, env.rng, view, false);
  },
};

/** Shooting stars: wait, then streak diagonally with a growing tail and a sine fade. */
export const shootingBehaviour: Behaviour = {
  spawn(p, layer, rng, _view, initial) {
    rollCommon(p, layer, rng);
    scheduleNext(p, layer, rng, initial);
    hide(p);
  },
  step(p, layer, env: StepEnv) {
    const { dt, view, rng } = env;
    if (waiting(p, dt)) return;
    if (p.ttl === 0) {
      p.dir = rng() < 0.5 ? -1 : 1;
      p.vx = pick(layer.config.vx, rng) * p.dir;
      p.vy = pick(layer.config.vy, rng);
      p.x = view.width * (0.15 + 0.7 * rng());
      p.y = bandY(layer, view, rng);
      p.ttl = SHOOT_TTL_MIN + SHOOT_TTL_SPAN * rng();
      p.life = 0;
    }
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle = Math.atan2(p.vy, p.vx);
    p.scaleX = 0.4 + 0.6 * Math.min(1, p.life / (p.ttl * SHOOT_GROW));
    p.scaleY = 1;
    p.drawAlpha = p.alpha * Math.max(0, Math.sin((Math.PI * p.life) / p.ttl));
    p.sprite = p.base;
    if (p.life >= p.ttl) shootingBehaviour.spawn(p, layer, rng, view, false);
  },
};
