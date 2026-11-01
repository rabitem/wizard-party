import type { Behaviour, StepEnv } from '../types';
import { MARGIN, bandY, rollCommon, spreadX, spreadY, twinkleAlpha, wrapX } from './shared';

/** Fog wisps are flattened by a random 0.45..0.7 vertical squash. */
const FOG_SQUASH_MIN = 0.45;
const FOG_SQUASH_SPAN = 0.25;
/** Vertical bob of a fog wisp (px/s). */
const FOG_BOB = 3;
/** Opacity breathing depth of a fog wisp. */
const FOG_BREATH = 0.3;

/**
 * Motes, embers, sparks, pollen and seeds: a base velocity plus a two-axis wander. Wraps on every
 * edge; a particle that wraps vertically gets a fresh x so the field never visibly repeats.
 */
export const driftBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    p.x = spreadX(view, rng);
    if (initial) p.y = spreadY(view, rng);
    else p.y = p.vy < 0 ? view.height + MARGIN * rng() : -MARGIN * rng();
  },
  step(p, layer, env: StepEnv) {
    const { dt, time, view } = env;
    const phi = time * p.freq + p.phase;
    const wanderX = p.amp * (Math.sin(phi) + 0.5 * Math.sin(phi * 1.9 + p.phase));
    const wanderY = p.amp * 0.6 * Math.cos(phi * 1.3 + p.phase * 0.7);
    p.x += (p.vx + env.wind.value * layer.config.windFactor + wanderX) * dt;
    p.y += (p.vy + wanderY) * dt;
    p.rot += p.spin * dt;
    p.angle = p.rot;
    if (p.y < -MARGIN) {
      p.y += view.height + MARGIN * 2;
      p.x = spreadX(view, env.rng);
    } else if (p.y > view.height + MARGIN) {
      p.y -= view.height + MARGIN * 2;
      p.x = spreadX(view, env.rng);
    }
    wrapX(p, view);
    p.drawAlpha = twinkleAlpha(p, time);
    p.sprite = p.base;
  },
};

/** Low fog: huge soft wisps sliding sideways inside a band, breathing slowly. */
export const fogBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    p.y = bandY(layer, view, rng);
    const half = p.size / 2;
    p.x = initial ? -half + rng() * (view.width + p.size) : -half - rng() * half * 0.4;
    p.dir = rng() < 0.5 ? -1 : 1;
    p.scaleX = p.dir;
    p.scaleY = FOG_SQUASH_MIN + FOG_SQUASH_SPAN * rng();
  },
  step(p, layer, env: StepEnv) {
    const { dt, time, view } = env;
    const half = p.size / 2;
    p.x += (p.vx + env.wind.value * layer.config.windFactor) * dt;
    p.y += Math.sin(time * p.freq * 0.7 + p.phase) * FOG_BOB * dt;
    if (p.x - half > view.width) p.x = -half;
    else if (p.x + half < 0) p.x = view.width + half;
    p.drawAlpha = p.alpha * (1 - FOG_BREATH + FOG_BREATH * Math.sin(time * p.freq + p.phase));
    p.sprite = p.base;
    p.angle = 0;
  },
};
