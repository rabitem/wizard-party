import { SPAWN_MARGIN, type AmbientLayerConfig } from '@/presentation/config/seasonal-ambience.config';
import { pick, type Particle, type Rng, type Viewport } from '../particle';
import type { LayerRuntime } from '../types';

export const TAU = Math.PI * 2;
export const MARGIN = SPAWN_MARGIN;

/** Fields every behaviour rolls the same way: size, opacity, sway, twinkle, sprite variant. */
export function rollCommon(p: Particle, layer: LayerRuntime, rng: Rng): void {
  const c: AmbientLayerConfig = layer.config;
  p.size = pick(c.size, rng);
  p.alpha = pick(c.opacity, rng);
  p.vx = pick(c.vx, rng);
  p.vy = pick(c.vy, rng);
  p.amp = pick(c.sway, rng);
  p.freq = pick(c.swayFreq, rng);
  p.phase = rng() * TAU;
  p.spin = c.spin ? pick(c.spin, rng) : 0;
  p.rot = c.spin ? rng() * TAU : 0;
  p.tumble = c.tumble ? pick(c.tumble, rng) : 0;
  p.twinkle = rng() < (c.twinkle ?? 0) ? 0.35 + 0.5 * rng() : 0;
  p.twinkleFreq = 1.2 + 3 * rng();
  p.base = Math.floor(rng() * layer.variants) % Math.max(1, layer.variants);
  p.sprite = p.base;
  p.angle = p.rot;
  p.scaleX = 1;
  p.scaleY = 1;
  p.life = 0;
  p.ttl = 0;
  p.wait = 0;
  p.dir = 1;
}

/** Random x across the viewport plus margins. */
export const spreadX = (view: Viewport, rng: Rng): number => -MARGIN + rng() * (view.width + MARGIN * 2);

/** Random y across the viewport plus margins. */
export const spreadY = (view: Viewport, rng: Rng): number => -MARGIN + rng() * (view.height + MARGIN * 2);

/** Wrap horizontally so wind never empties one side of the screen. */
export function wrapX(p: Particle, view: Viewport): void {
  const span = view.width + MARGIN * 2;
  if (p.x > view.width + MARGIN) p.x -= span;
  else if (p.x < -MARGIN) p.x += span;
}

/** Opacity with the particle's twinkle applied (0 twinkle = steady). */
export function twinkleAlpha(p: Particle, time: number): number {
  if (p.twinkle === 0) return p.alpha;
  return p.alpha * (1 - p.twinkle * (0.5 + 0.5 * Math.sin(time * p.twinkleFreq + p.phase)));
}

/** Random y inside the layer's vertical band (whole viewport without one). */
export function bandY(layer: LayerRuntime, view: Viewport, rng: Rng): number {
  const [top, bottom] = layer.config.band ?? [0, 1];
  return (top + rng() * (bottom - top)) * view.height;
}
