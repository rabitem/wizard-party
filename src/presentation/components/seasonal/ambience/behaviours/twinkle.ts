import type { Behaviour, StepEnv } from '../types';
import { rollCommon } from './shared';

/** Twinkle depth for stars that are not picked as strong twinklers. */
const STEADY_TWINKLE = 0.15;
/** Pixel stars blink in this many hard brightness steps. */
const PIXEL_STEPS = 3;
/** Soft stars breathe their size a little with the pulse. */
const SIZE_BREATH = 0.15;

/**
 * Fixed stars. Position is stored normalised (vx/vy hold 0..1 viewport fractions) so the sky
 * re-fits on resize instead of bunching in the old viewport.
 */
export const twinkleBehaviour: Behaviour = {
  spawn(p, layer, rng, view) {
    rollCommon(p, layer, rng);
    const [top, bottom] = layer.config.band ?? [0, 1];
    p.vx = rng();
    p.vy = top + rng() * (bottom - top);
    p.x = p.vx * view.width;
    p.y = p.vy * view.height;
    if (p.twinkle === 0) p.twinkle = STEADY_TWINKLE;
    else p.twinkle = 0.4 + 0.6 * rng();
    p.twinkleFreq = p.freq;
  },
  step(p, layer, env: StepEnv) {
    p.x = p.vx * env.view.width;
    p.y = p.vy * env.view.height;
    let pulse = 0.5 + 0.5 * Math.sin(env.time * p.twinkleFreq + p.phase);
    if (layer.config.pixelated) pulse = Math.round(pulse * PIXEL_STEPS) / PIXEL_STEPS;
    p.drawAlpha = p.alpha * (1 - p.twinkle * (1 - pulse));
    const scale = layer.config.pixelated ? 1 : 1 - SIZE_BREATH + SIZE_BREATH * pulse;
    p.scaleX = scale;
    p.scaleY = scale;
    p.angle = 0;
    p.sprite = p.base;
  },
};
