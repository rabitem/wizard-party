import {
  AMBIENCE_SEED,
  MAX_FRAME_DT,
  REDUCED_MOTION_DENSITY,
  TIER_DENSITY,
  TIER_MAX_DPR,
  type AmbientPack,
  type DeviceTier,
} from '@/presentation/config/seasonal-ambience.config';
import { BEHAVIOURS } from './behaviours';
import { createRandom, type Viewport } from './particle';
import { activeLayers, layerRuntime, resolveLayerCounts, syncPopulation } from './population';
import { renderLayers, type RenderLayer } from './renderer';
import { buildLayerSprites } from './sprites';
import type { StepEnv } from './types';
import { createWind, stepWind } from './wind';

export interface AmbienceEngineOptions {
  pack: AmbientPack;
  tier: DeviceTier;
  /** Draw one sparse static frame instead of animating. */
  reducedMotion: boolean;
  seed?: number;
}

export interface AmbienceEngine {
  destroy(): void;
}

const NOOP_ENGINE: AmbienceEngine = { destroy: () => {} };

/**
 * Canvas particle engine for the page ambience. Sizes itself to the canvas' CSS box (a zero box,
 * e.g. display:none on game pages, pauses it), animates with requestAnimationFrame, stops while
 * the tab is hidden, and under reduced motion renders a single static frame per resize.
 */
export function createAmbienceEngine(canvas: HTMLCanvasElement, options: AmbienceEngineOptions): AmbienceEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) return NOOP_ENGINE;
  const { pack, tier, reducedMotion } = options;
  const dpr = Math.min(window.devicePixelRatio || 1, TIER_MAX_DPR[tier]);
  const densityScale = TIER_DENSITY[tier] * (reducedMotion ? REDUCED_MOTION_DENSITY : 1);
  const rng = createRandom(options.seed ?? AMBIENCE_SEED);
  const view: Viewport = { width: 0, height: 0 };
  const configs = activeLayers(pack.layers, reducedMotion);
  const layers: RenderLayer[] = configs.map((config) => {
    const runtime = layerRuntime(config);
    return { runtime, sprites: buildLayerSprites(runtime, dpr), particles: [] };
  });
  const env: StepEnv = { view, time: 0, dt: 0, wind: createWind(pack.wind, rng), rng };

  let frame = 0;
  let last = 0;
  let destroyed = false;

  const stepAll = (dt: number) => {
    env.dt = dt;
    env.time += dt;
    if (dt > 0) stepWind(env.wind, pack.wind, rng, dt);
    for (let l = 0; l < layers.length; l++) {
      const { runtime, particles } = layers[l];
      const behaviour = BEHAVIOURS[runtime.config.behaviour];
      for (let i = 0; i < particles.length; i++) behaviour.step(particles[i], runtime, env);
    }
    renderLayers(ctx, layers, dpr, canvas.width, canvas.height);
  };

  const tick = (now: number) => {
    frame = 0;
    if (destroyed) return;
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_DT) : 0;
    last = now;
    stepAll(dt);
    frame = requestAnimationFrame(tick);
  };

  const canRun = () => !destroyed && !reducedMotion && view.width > 0 && view.height > 0 && !document.hidden;

  const start = () => {
    if (frame || !canRun()) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const resize = (width: number, height: number) => {
    view.width = width;
    view.height = height;
    if (width <= 0 || height <= 0) {
      stop();
      return;
    }
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const counts = resolveLayerCounts(configs, view, densityScale);
    layers.forEach((layer, index) => syncPopulation(layer.particles, layer.runtime, counts[index], rng, view));
    if (reducedMotion) stepAll(0);
    else if (frame) renderLayers(ctx, layers, dpr, canvas.width, canvas.height);
    else start();
  };

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  let observer: ResizeObserver | null = null;
  const onWindowResize = () => resize(canvas.clientWidth, canvas.clientHeight);
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (box) resize(box.width, box.height);
    });
    observer.observe(canvas);
  } else {
    window.addEventListener('resize', onWindowResize);
  }
  onWindowResize();

  return {
    destroy() {
      destroyed = true;
      stop();
      observer?.disconnect();
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibility);
      layers.length = 0;
    },
  };
}
