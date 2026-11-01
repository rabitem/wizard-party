/**
 * Shared realism toolkit configuration (see
 * components/three/themed-environments/primitives/realism/).
 *
 * - DEVICE_TIER: how particle counts and texture sizes scale per device.
 * - PARTICLE_KINDS: per-kind look and motion for RealisticParticleField.
 * - Atmosphere (exposure, bloom, optional key/fill lights) per themed room
 *   lives in realism-atmosphere.config.ts.
 */

export type DeviceTier = 'low' | 'medium' | 'high';

export type ParticleKind = 'snow' | 'rain' | 'leaves' | 'petals' | 'embers' | 'dust' | 'fireflies' | 'pollen';

export type ParticleSprite = 'snow' | 'rain' | 'leaf' | 'petal' | 'glow' | 'mote';

// =============================================================================
// DEVICE TIERS
// =============================================================================
export const DEVICE_TIER = {
  /** Particle count multiplier per tier */
  PARTICLE_MULTIPLIER: { low: 0.35, medium: 0.6, high: 1 } satisfies Record<DeviceTier, number>,
  /** Reduced-motion users get a sparse, frozen field */
  REDUCED_MOTION_MULTIPLIER: 0.3,
  /** Largest point sprite (CSS pixels, scaled by dpr) - limits near-camera fill rate */
  MAX_POINT_SIZE: { low: 28, medium: 40, high: 56 } satisfies Record<DeviceTier, number>,
  /** Procedural PBR texture edge length per tier */
  PBR_TEXTURE_SIZE: { low: 256, medium: 512, high: 1024 } satisfies Record<DeviceTier, number>,
  /** Heuristics used by resolveDeviceTier */
  LOW_CORES: 4,
  HIGH_CORES: 8,
  LOW_MEMORY_GB: 4,
} as const;

// =============================================================================
// PARTICLES
// =============================================================================
/**
 * One depth layer of a particle field. Layers are listed far -> near: the
 * buffer is written in that order so near (large, soft) particles draw last.
 */
export interface ParticleLayerSpec {
  /** Share of the total count (normalised across layers) */
  share: number;
  /** World-space sprite size range */
  size: readonly [number, number];
  opacity: readonly [number, number];
  /** Fall / drift speed multiplier (parallax: near layers move faster) */
  speed: number;
  /** Defocus blur 0..1 applied when the particle is closer than the focus distance */
  blur: number;
}

export interface ParticleKindPreset {
  sprite: ParticleSprite;
  additive: boolean;
  colors: readonly string[];
  /** Count on a high-tier device before multipliers */
  baseCount: number;
  /** Absolute cap after scaling */
  maxCount: number;
  /** Terminal velocity in units/s (negative rises, e.g. embers) */
  fallSpeed: number;
  /** Lateral sway amplitude and frequency */
  sway: number;
  swayFrequency: number;
  /** Curl-like turbulence amplitude */
  turbulence: number;
  /** Base wind velocity (units/s) and gust strength (0..1) */
  wind: readonly [number, number, number];
  gust: number;
  /** In-plane sprite rotation speed (rad/s) and 3D flip (tumble) speed */
  spin: number;
  flip: number;
  /** 0..1 brightness flicker (embers, fireflies) */
  flicker: number;
  /** 0..1 fade + cool-down with height (embers) */
  heightFade: number;
  /** Distance in front of the camera that is in focus (closer = defocused) */
  focusDistance: number;
  layers: readonly ParticleLayerSpec[];
}

const SNOW_LAYERS: readonly ParticleLayerSpec[] = [
  { share: 0.55, size: [0.045, 0.075], opacity: [0.55, 0.85], speed: 0.8, blur: 0 },
  { share: 0.32, size: [0.075, 0.12], opacity: [0.7, 0.95], speed: 1, blur: 0.25 },
  { share: 0.13, size: [0.13, 0.2], opacity: [0.6, 0.85], speed: 1.25, blur: 0.9 },
];

const LEAF_LAYERS: readonly ParticleLayerSpec[] = [
  { share: 0.5, size: [0.22, 0.32], opacity: [0.85, 1], speed: 0.85, blur: 0 },
  { share: 0.35, size: [0.32, 0.45], opacity: [0.9, 1], speed: 1, blur: 0.15 },
  { share: 0.15, size: [0.45, 0.6], opacity: [0.85, 1], speed: 1.15, blur: 0.6 },
];

const MOTE_LAYERS: readonly ParticleLayerSpec[] = [
  { share: 0.6, size: [0.03, 0.05], opacity: [0.4, 0.75], speed: 0.8, blur: 0 },
  { share: 0.3, size: [0.05, 0.08], opacity: [0.5, 0.85], speed: 1, blur: 0.3 },
  { share: 0.1, size: [0.09, 0.14], opacity: [0.35, 0.6], speed: 1.2, blur: 0.9 },
];

const GLOW_LAYERS: readonly ParticleLayerSpec[] = [
  { share: 0.55, size: [0.14, 0.22], opacity: [0.7, 1], speed: 0.85, blur: 0 },
  { share: 0.35, size: [0.22, 0.32], opacity: [0.8, 1], speed: 1, blur: 0.2 },
  { share: 0.1, size: [0.32, 0.45], opacity: [0.6, 0.9], speed: 1.15, blur: 0.7 },
];

export const PARTICLE_KINDS: Readonly<Record<ParticleKind, ParticleKindPreset>> = {
  snow: {
    sprite: 'snow', additive: false, colors: ['#ffffff', '#f2f6ff', '#e3ecff'],
    baseCount: 520, maxCount: 900, fallSpeed: 0.5, sway: 0.18, swayFrequency: 0.55, turbulence: 0.32,
    wind: [0.12, 0, 0.04], gust: 0.45, spin: 0, flip: 0, flicker: 0, heightFade: 0, focusDistance: 5,
    layers: SNOW_LAYERS,
  },
  rain: {
    sprite: 'rain', additive: false, colors: ['#c9d6e6', '#b8c7da', '#dfe7f1'],
    baseCount: 600, maxCount: 1000, fallSpeed: 7.5, sway: 0, swayFrequency: 0, turbulence: 0.04,
    wind: [0.6, 0, 0.15], gust: 0.3, spin: 0, flip: 0, flicker: 0, heightFade: 0, focusDistance: 4,
    layers: [
      { share: 0.6, size: [0.18, 0.26], opacity: [0.35, 0.55], speed: 0.9, blur: 0 },
      { share: 0.3, size: [0.26, 0.36], opacity: [0.4, 0.6], speed: 1, blur: 0.15 },
      { share: 0.1, size: [0.38, 0.5], opacity: [0.3, 0.45], speed: 1.1, blur: 0.4 },
    ],
  },
  leaves: {
    sprite: 'leaf', additive: false, colors: ['#c4471d', '#d9822b', '#e8b83a', '#8f3a1c', '#b5651d'],
    baseCount: 70, maxCount: 120, fallSpeed: 0.45, sway: 0.55, swayFrequency: 0.7, turbulence: 0.35,
    wind: [0.18, 0, 0.06], gust: 0.5, spin: 1.1, flip: 1.6, flicker: 0, heightFade: 0, focusDistance: 5,
    layers: LEAF_LAYERS,
  },
  petals: {
    sprite: 'petal', additive: false, colors: ['#ffd1dc', '#ffb7c9', '#fff0f4', '#f7a8c0'],
    baseCount: 110, maxCount: 180, fallSpeed: 0.3, sway: 0.45, swayFrequency: 0.8, turbulence: 0.4,
    wind: [0.15, 0, 0.05], gust: 0.5, spin: 1.4, flip: 2.2, flicker: 0, heightFade: 0, focusDistance: 5,
    layers: [
      { share: 0.5, size: [0.13, 0.19], opacity: [0.8, 1], speed: 0.85, blur: 0 },
      { share: 0.35, size: [0.19, 0.27], opacity: [0.85, 1], speed: 1, blur: 0.15 },
      { share: 0.15, size: [0.28, 0.38], opacity: [0.75, 0.95], speed: 1.15, blur: 0.6 },
    ],
  },
  embers: {
    sprite: 'glow', additive: true, colors: ['#ffd27a', '#ffa040', '#ff7a2a', '#ffe2a8'],
    baseCount: 90, maxCount: 160, fallSpeed: -0.6, sway: 0.12, swayFrequency: 1.4, turbulence: 0.28,
    wind: [0.03, 0, 0.01], gust: 0.4, spin: 0, flip: 0, flicker: 0.85, heightFade: 1, focusDistance: 4,
    layers: [
      { share: 0.6, size: [0.08, 0.13], opacity: [0.8, 1], speed: 0.85, blur: 0 },
      { share: 0.3, size: [0.13, 0.2], opacity: [0.85, 1], speed: 1, blur: 0.15 },
      { share: 0.1, size: [0.2, 0.3], opacity: [0.6, 0.85], speed: 1.2, blur: 0.6 },
    ],
  },
  dust: {
    sprite: 'mote', additive: true, colors: ['#fff4d6', '#ffe9c2', '#ffffff'],
    baseCount: 160, maxCount: 260, fallSpeed: 0.02, sway: 0.06, swayFrequency: 0.25, turbulence: 0.3,
    wind: [0.02, 0.005, 0.01], gust: 0.3, spin: 0, flip: 0, flicker: 0.25, heightFade: 0, focusDistance: 4,
    layers: MOTE_LAYERS,
  },
  fireflies: {
    sprite: 'glow', additive: true, colors: ['#d8ff7a', '#f2ff9e', '#b8f560'],
    baseCount: 60, maxCount: 100, fallSpeed: 0, sway: 0.35, swayFrequency: 0.35, turbulence: 0.7,
    wind: [0.02, 0, 0.01], gust: 0.2, spin: 0, flip: 0, flicker: 1, heightFade: 0, focusDistance: 5,
    layers: GLOW_LAYERS,
  },
  pollen: {
    sprite: 'mote', additive: false, colors: ['#ffe680', '#fff2b0', '#f5d860'],
    baseCount: 140, maxCount: 220, fallSpeed: 0.05, sway: 0.2, swayFrequency: 0.3, turbulence: 0.45,
    wind: [0.08, 0.01, 0.03], gust: 0.4, spin: 0, flip: 0, flicker: 0.1, heightFade: 0, focusDistance: 4,
    layers: MOTE_LAYERS,
  },
};

export const PARTICLE_FIELD = {
  /** Sprite texture edge length (px) */
  SPRITE_SIZE: 64,
  /** Fade band (fraction of the box) at the volume edges to hide wrap-around */
  EDGE_FADE: 0.06,
  /** Particles closer than this (units) to the camera fade out */
  NEAR_FADE: [0.35, 1.4] as const,
  /** Default keep-clear radius around the table centre (beyond the wood rim) */
  TABLE_CLEAR_RADIUS: 3.4,
  /** Width of the soft edge of the clear zone */
  CLEAR_FEATHER: 0.9,
  /** Time used for the frozen reduced-motion layout */
  FROZEN_TIME: 17,
} as const;

// =============================================================================
// ATMOSPHERE HELPERS
// =============================================================================
export const GROUND_FOG = {
  LAYERS: { low: 2, medium: 3, high: 4 } satisfies Record<DeviceTier, number>,
  NOISE_TEXTURE_SIZE: 128,
  /** Scroll speed of the noise in UV/s */
  SCROLL_SPEED: 0.012,
} as const;

export const LIGHT_SHAFTS = {
  RADIAL_SEGMENTS: 20,
  /** Edge softness exponent for the view-angle falloff */
  EDGE_SOFTNESS: 1.6,
} as const;

export const WINDOW_VIEW = {
  FROST_TEXTURE_SIZE: 512,
  LAYER_TEXTURE_SIZE: [1024, 256] as const,
  /**
   * Painted layers behind the glass, in units of the window height: depth
   * behind the glass, bottom edge (relative to the window centre), layer
   * height and repeat width (4x the height keeps the 4:1 textures undistorted).
   */
  LAYERS: {
    mountains: { depth: 8, base: -0.9, height: 1.4, width: 5.6 },
    farTrees: { depth: 3, base: -0.75, height: 0.9, width: 3.6 },
    nearTrees: { depth: 1.2, base: -0.62, height: 0.8, width: 3.2 },
  },
  /** Trees per texture: dense far forest, sparse near trees */
  TREE_COUNTS: { dense: 46, sparse: 14 },
  /**
   * Vertical parallax compression (0..1). The game camera looks down on the
   * walls; with true vertical perspective windows would only show ground.
   */
  VERTICAL_PARALLAX: 0.2,
  /** Height (window heights) of the snow drift on the outer sill */
  SILL_DRIFT: 0.09,
  /** In-shader precipitation layers per tier (each one is a cheap cell lookup) */
  PRECIPITATION_LAYERS: { low: 2, medium: 3, high: 4 } satisfies Record<DeviceTier, number>,
} as const;

export type WindowViewVariant = 'night' | 'dusk' | 'day';
export type WindowPrecipitation = 'snow' | 'rain' | 'none';

/** Colours of the painted outdoor view (sRGB hex). */
export interface WindowViewPalette {
  skyTop: string;
  skyHorizon: string;
  /** Snow / ground colour (also tints snow caps and branch snow) */
  snow: string;
  mountain: string;
  treeFar: string;
  treeNear: string;
  /** Moon or sun colour */
  celestial: string;
  /** Precipitation colour */
  flakes: string;
  /** Frost tint on the glass */
  frost: string;
  /** 0..1 star density */
  stars: number;
  /** Moon/sun centre relative to the window centre and its radius, in window heights (parallax applies) */
  celestialPosition: readonly [number, number];
  celestialSize: number;
  /** Overall multiplier: night views are dim, day views bright */
  brightness: number;
}

export const WINDOW_VIEW_VARIANTS: Readonly<Record<WindowViewVariant, WindowViewPalette>> = {
  night: {
    skyTop: '#070d22', skyHorizon: '#24365f', snow: '#9cb0d2', mountain: '#3c4d74', treeFar: '#1a2740',
    treeNear: '#0c1525', celestial: '#eef2ff', flakes: '#e8efff', frost: '#dfeaff', stars: 1,
    celestialPosition: [0.28, 0.3], celestialSize: 0.06, brightness: 0.75,
  },
  dusk: {
    skyTop: '#272a5a', skyHorizon: '#f09a74', snow: '#e4c9cf', mountain: '#665a86', treeFar: '#2c2a4a',
    treeNear: '#17172b', celestial: '#ffd7a8', flakes: '#fff1ea', frost: '#ffe9e2', stars: 0.25,
    celestialPosition: [-0.25, 0.02], celestialSize: 0.09, brightness: 1,
  },
  day: {
    skyTop: '#5f9ee0', skyHorizon: '#d6eaff', snow: '#f4f8ff', mountain: '#8199bd', treeFar: '#39574a',
    treeNear: '#22372c', celestial: '#fffbe6', flakes: '#ffffff', frost: '#f2f8ff', stars: 0,
    celestialPosition: [0.3, 0.3], celestialSize: 0.07, brightness: 1.1,
  },
};
