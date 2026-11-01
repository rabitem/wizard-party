/**
 * Per-room atmosphere: tone-mapping exposure, optional extra key / fill /
 * ambient lights and an optional subtle bloom. Read through
 * getEnvironmentAtmosphere() in themed-environments/environment-registry.ts.
 *
 * Rooms not listed here (the casino) get no atmosphere at all, so their look
 * is unchanged. Lights here never cast shadows; SceneLighting stays active
 * underneath every room.
 */
import type { Vec3 } from './themed-environment.config';

export interface AtmosphereLight {
  color: string;
  intensity: number;
  position: Vec3;
}

export interface AtmosphereBloom {
  intensity: number;
  /** Linear luminance above which pixels glow - keep high so only flames, neon and emissives bloom */
  threshold: number;
  smoothing?: number;
  /** Mipmap blur radius 0..1 */
  radius?: number;
}

export interface EnvironmentAtmosphere {
  /** renderer.toneMappingExposure while the room is mounted (default 1) */
  exposure?: number;
  ambient?: { color: string; intensity: number };
  /** Warm key light (directional, no shadows) */
  key?: AtmosphereLight;
  /** Cool fill light (directional, no shadows) */
  fill?: AtmosphereLight;
  bloom?: AtmosphereBloom;
}

export const BLOOM_DEFAULTS = {
  SMOOTHING: 0.12,
  RADIUS: 0.6,
  /** Mipmap levels per quality: fewer levels = cheaper, tighter glow */
  LEVELS: { medium: 5, high: 7 },
} as const;

/** Keyed by table theme id (same keys as THEMED_ENVIRONMENTS). */
export const ENVIRONMENT_ATMOSPHERES: Readonly<Record<string, EnvironmentAtmosphere>> = {
  halloween: {
    exposure: 0.98,
    // Cool moonlight from the gothic windows; warmth comes from the flickering pumpkin / candle / cauldron point lights.
    fill: { color: '#7d8fe0', intensity: 0.26, position: [0, 9, -16] },
    bloom: { intensity: 0.6, threshold: 0.8, radius: 0.65 },
  },
  // Late-afternoon sun low through the barn window (warm key) vs. a faint cool sky fill.
  autumn: {
    exposure: 1.05,
    key: { color: '#ffbf73', intensity: 0.45, position: [4, 7, -22] },
    fill: { color: '#8f9cc4', intensity: 0.12, position: [-6, 9, 14] },
    bloom: { intensity: 0.36, threshold: 0.84, radius: 0.62 },
  },
  // Cold moonlight from the porch archway (cool fill) vs. the warm hearth, candles and tree (bloom).
  winter: {
    exposure: 1.02,
    fill: { color: '#8fb0ff', intensity: 0.32, position: [-5, 12, -30] },
    bloom: { intensity: 0.45, threshold: 0.82, radius: 0.65 },
  },
  spring: {
    exposure: 1.05,
    // Low warm morning sun from behind the cherry trees, cool lavender sky fill; lanterns, fountain glints and sunlit petals bloom softly.
    key: { color: '#ffd6a8', intensity: 0.38, position: [-6, 7, -16] },
    fill: { color: '#c8c4f0', intensity: 0.12, position: [4, 9, 12] },
    bloom: { intensity: 0.3, threshold: 0.87, radius: 0.62 },
  },
  summer: {
    exposure: 1.06,
    key: { color: '#ffb478', intensity: 0.45, position: [0, 4, -20] },
    fill: { color: '#8fb6d6', intensity: 0.16, position: [-6, 8, 14] },
    bloom: { intensity: 0.42, threshold: 0.86, radius: 0.65 },
  },
  manga: {
    exposure: 1.03,
    key: { color: '#eef2ff', intensity: 0.42, position: [2, 9, -16] },
    fill: { color: '#ffd8a6', intensity: 0.14, position: [0, 6, 12] },
    bloom: { intensity: 0.36, threshold: 0.85, radius: 0.6 },
  },
  neon: {
    exposure: 1.05,
    // Warm magenta sign spill from behind the table, cool cyan city fill from the side
    key: { color: '#ff7ad9', intensity: 0.35, position: [-6, 9, -10] },
    fill: { color: '#4fc8ff', intensity: 0.28, position: [9, 6, 6] },
    bloom: { intensity: 0.8, threshold: 0.7, smoothing: 0.15, radius: 0.72 },
  },
  pixel: {
    exposure: 1.03,
    // Warm marquee key, cool screen fill; bloom catches CRTs, stars and neon stripes
    key: { color: '#ffe0a0', intensity: 0.25, position: [3, 10, 6] },
    fill: { color: '#7aa8ff', intensity: 0.2, position: [-8, 5, -6] },
    bloom: { intensity: 0.6, threshold: 0.76, smoothing: 0.14, radius: 0.6 },
  },
  celestial: {
    exposure: 1.02,
    // Cool starlight falling through the dome; the gold key, candelabra and crystal ball stay the warm sources.
    fill: { color: '#8a9cff', intensity: 0.22, position: [-3, 14, -6] },
    bloom: { intensity: 0.65, threshold: 0.76, radius: 0.7 },
  },
  solarpunk: {
    exposure: 1.04,
    // Bright midday sun through the glass roof (same lean as the sun shafts), cool sky bounce; sun entry glows and water glints bloom.
    key: { color: '#fff0c8', intensity: 0.42, position: [-5, 14, -8] },
    fill: { color: '#cfe8ff', intensity: 0.14, position: [6, 8, 12] },
    bloom: { intensity: 0.38, threshold: 0.85, radius: 0.65 },
  },
};
