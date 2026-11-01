import { DEVICE_TIER, type DeviceTier, type ParticleLayerSpec } from '@/presentation/config/realism.config';
import { seededRandom } from '../instancing';

/** Number of floats per particle in each buffer. */
export const PARTICLE_STRIDE = { position: 3, seed: 4, shape: 4, color: 3 } as const;

export interface ParticleBuffers {
  count: number;
  /** Normalised spawn position inside the volume, each axis in [0, 1) */
  positions: Float32Array;
  /** Four independent randoms per particle in [0, 1) (speed, wind, phase, turbulence offset) */
  seeds: Float32Array;
  /** size (world units), opacity, speed multiplier, defocus blur */
  shapes: Float32Array;
  /** Per-layer particle counts (far -> near, matches layer order) */
  layerCounts: number[];
}

/**
 * Particle count for a device tier: base * tier multiplier (* reduced-motion
 * multiplier), rounded and clamped to [0, cap].
 */
export function particleCountForTier(base: number, tier: DeviceTier, reducedMotion: boolean, cap: number): number {
  const scaled = base * DEVICE_TIER.PARTICLE_MULTIPLIER[tier] * (reducedMotion ? DEVICE_TIER.REDUCED_MOTION_MULTIPLIER : 1);
  return Math.max(0, Math.min(cap, Math.round(scaled)));
}

/** Splits a total into per-layer counts proportional to each layer's share; the remainder goes to the first (far) layer. */
export function splitLayerCounts(total: number, layers: readonly ParticleLayerSpec[]): number[] {
  if (layers.length === 0 || total <= 0) return layers.map(() => 0);
  const shareSum = layers.reduce((sum, layer) => sum + Math.max(0, layer.share), 0) || 1;
  const counts = layers.map((layer) => Math.floor((total * Math.max(0, layer.share)) / shareSum));
  counts[0] += total - counts.reduce((sum, n) => sum + n, 0);
  return counts;
}

function lerp(range: readonly [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

/**
 * Deterministic seeded particle layout. Particles are written layer by layer
 * in the given order (far -> near) so the near, large, soft layer draws last:
 * a cheap "sorted-ish" order for depthWrite=false sprites.
 */
export function buildParticleBuffers(count: number, layers: readonly ParticleLayerSpec[], seed = 1): ParticleBuffers {
  const layerCounts = splitLayerCounts(count, layers);
  const total = layerCounts.reduce((sum, n) => sum + n, 0);
  const positions = new Float32Array(total * PARTICLE_STRIDE.position);
  const seeds = new Float32Array(total * PARTICLE_STRIDE.seed);
  const shapes = new Float32Array(total * PARTICLE_STRIDE.shape);
  const rand = seededRandom(seed * 9973 + 17);

  let index = 0;
  layers.forEach((layer, layerIndex) => {
    for (let n = 0; n < layerCounts[layerIndex]; n++, index++) {
      for (let axis = 0; axis < PARTICLE_STRIDE.position; axis++) positions[index * 3 + axis] = rand();
      for (let k = 0; k < PARTICLE_STRIDE.seed; k++) seeds[index * 4 + k] = rand();
      shapes[index * 4] = lerp(layer.size, rand());
      shapes[index * 4 + 1] = lerp(layer.opacity, rand());
      shapes[index * 4 + 2] = layer.speed;
      shapes[index * 4 + 3] = layer.blur;
    }
  });

  return { count: total, positions, seeds, shapes, layerCounts };
}

/** Picks a palette colour (RGB triple, already in the working colour space) per particle from its last seed component. */
export function buildParticleColors(
  seeds: Float32Array,
  palette: readonly (readonly [number, number, number])[],
): Float32Array {
  const count = seeds.length / PARTICLE_STRIDE.seed;
  const colors = new Float32Array(count * PARTICLE_STRIDE.color);
  if (palette.length === 0) return colors.fill(1);
  for (let i = 0; i < count; i++) {
    const pick = palette[Math.min(palette.length - 1, Math.floor(seeds[i * 4 + 3] * palette.length))];
    colors.set(pick, i * 3);
  }
  return colors;
}
