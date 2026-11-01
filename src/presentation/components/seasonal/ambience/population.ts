import {
  DENSITY_AREA_UNIT,
  MAX_TOTAL_PARTICLES,
  MOTION_ONLY_BEHAVIOURS,
  type AmbientLayerConfig,
} from '@/presentation/config/seasonal-ambience.config';
import { BEHAVIOURS } from './behaviours';
import { createParticle, type Particle, type Rng, type Viewport } from './particle';
import type { LayerRuntime } from './types';

export { layerRuntime } from './layer-runtime';

/** Layers that run in the current motion mode (moving-only kinds drop out when reduced). */
export function activeLayers(
  layers: readonly AmbientLayerConfig[],
  reducedMotion: boolean,
): AmbientLayerConfig[] {
  return reducedMotion ? layers.filter((l) => !MOTION_ONLY_BEHAVIOURS.includes(l.behaviour)) : [...layers];
}

/** Particle count for one layer: density x viewport area x device scale, capped. */
export function resolveParticleCount(config: AmbientLayerConfig, view: Viewport, densityScale: number): number {
  const area = (Math.max(0, view.width) * Math.max(0, view.height)) / DENSITY_AREA_UNIT;
  if (area === 0) return 0;
  const count = Math.max(config.minCount ?? 0, Math.round(config.density * area * densityScale));
  return Math.min(config.maxCount, count);
}

/** Counts for every layer, scaled down together if the pack would exceed MAX_TOTAL_PARTICLES. */
export function resolveLayerCounts(
  layers: readonly AmbientLayerConfig[],
  view: Viewport,
  densityScale: number,
  maxTotal = MAX_TOTAL_PARTICLES,
): number[] {
  const counts = layers.map((layer) => resolveParticleCount(layer, view, densityScale));
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total <= maxTotal) return counts;
  const factor = maxTotal / total;
  return counts.map((n) => Math.floor(n * factor));
}

/**
 * Grow or shrink a layer's particle pool to `target`. New particles spawn anywhere on screen;
 * survivors keep their state so a resize (e.g. a mobile URL bar) does not reset the scene.
 */
export function syncPopulation(
  particles: Particle[],
  runtime: LayerRuntime,
  target: number,
  rng: Rng,
  view: Viewport,
): void {
  if (particles.length > target) {
    particles.length = target;
    return;
  }
  const behaviour = BEHAVIOURS[runtime.config.behaviour];
  while (particles.length < target) {
    const p = createParticle();
    behaviour.spawn(p, runtime, rng, view, true);
    particles.push(p);
  }
}
