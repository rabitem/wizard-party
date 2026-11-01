import { pick } from '../particle';
import type { Behaviour, StepEnv } from '../types';
import { MARGIN, bandY, rollCommon, spreadX, spreadY, wrapX } from './shared';

const DEFAULT_GLINT_LIFE = [0.8, 1.4] as const;
/** Max tilt of an ink speed line (rad). */
const GLINT_TILT = 0.06;
/** Ink lines vary in thickness. */
const GLINT_THICKNESS_MIN = 0.5;

/** Rain: fast streaks stretched along their (wind-bent) velocity. */
export const rainBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    p.x = spreadX(view, rng);
    p.y = initial ? spreadY(view, rng) : -p.size - rng() * MARGIN;
  },
  step(p, layer, env: StepEnv) {
    const { dt, view } = env;
    const vx = p.vx + env.wind.value * layer.config.windFactor;
    p.x += vx * dt;
    p.y += p.vy * dt;
    p.angle = Math.atan2(p.vy, vx);
    p.scaleX = 1;
    p.scaleY = 1;
    p.drawAlpha = p.alpha;
    p.sprite = p.base;
    if (p.y > view.height + p.size) rainBehaviour.spawn(p, layer, env.rng, view, false);
    wrapX(p, view);
  },
};

/** Manga ink speed lines: short-lived horizontal glints that slide and fade in and out. */
export const glintBehaviour: Behaviour = {
  spawn(p, layer, rng, view, initial) {
    rollCommon(p, layer, rng);
    p.ttl = pick(layer.config.interval ?? DEFAULT_GLINT_LIFE, rng);
    p.life = initial ? rng() * p.ttl : 0;
    p.dir = rng() < 0.5 ? -1 : 1;
    p.vx = Math.abs(p.vx) * p.dir;
    p.x = rng() * view.width;
    p.y = bandY(layer, view, rng);
    p.rot = (rng() * 2 - 1) * GLINT_TILT;
    p.scaleY = GLINT_THICKNESS_MIN + (1 - GLINT_THICKNESS_MIN) * rng();
  },
  step(p, layer, env: StepEnv) {
    p.life += env.dt;
    p.x += p.vx * env.dt;
    p.angle = p.rot;
    // The streak sprite's bright head points along +x, so mirror lines moving left.
    p.scaleX = p.dir;
    const t = Math.sin((Math.PI * p.life) / p.ttl);
    p.drawAlpha = p.alpha * t * t;
    p.sprite = p.base;
    if (p.life >= p.ttl) glintBehaviour.spawn(p, layer, env.rng, env.view, false);
  },
};
