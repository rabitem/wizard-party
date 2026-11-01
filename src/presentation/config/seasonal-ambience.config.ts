import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import { AMBIENCE_PACKS } from './seasonal-ambience-packs.config';

/**
 * How a particle moves. Each behaviour lives in components/seasonal/ambience/behaviours/.
 * - fall: snow - slow fall, sway, turbulence, twinkle
 * - flutter: leaves/petals - pendulum swing, 3D tumble (scaleX flip), spin, optional swirl
 * - drift: motes, embers, sparks, pollen, seeds - slow wander with a base velocity
 * - fog: wide soft wisps drifting sideways in a horizontal band, breathing opacity
 * - bat: occasional crossing with a flapping-frame animation
 * - rain: fast stretched streaks along their velocity
 * - twinkle: fixed stars that pulse (optionally in hard pixel steps)
 * - shooting: occasional streak across the sky
 * - glint: short-lived horizontal ink speed lines
 */
export type AmbientBehaviour =
  | 'fall' | 'flutter' | 'drift' | 'fog' | 'bat' | 'rain' | 'twinkle' | 'shooting' | 'glint';

/** Which pre-rendered sprite set a layer draws (components/seasonal/ambience/sprites/). */
export type AmbientSprite =
  | 'flake' | 'bokeh' | 'glow' | 'leaf' | 'petal' | 'seed' | 'fog' | 'bat' | 'streak' | 'star' | 'pixel';

/** [min, max] range; a value is picked uniformly per particle. */
export type Range = readonly [number, number];

/** One particle layer of a theme pack. Speeds in CSS px/s, sizes in CSS px, times in s. */
export interface AmbientLayerConfig {
  behaviour: AmbientBehaviour;
  sprite: AmbientSprite;
  /** Particles per million CSS px² of viewport (scaled by device tier, capped by maxCount). */
  density: number;
  /** Hard ceiling for this layer regardless of viewport. */
  maxCount: number;
  /** Floor so rare-but-essential particles (a bat, a shooting star) survive small screens. */
  minCount?: number;
  /** Drawn sprite box size. */
  size: Range;
  /** Base opacity. */
  opacity: Range;
  /** Horizontal / vertical base velocity (negative vy rises). */
  vx: Range;
  vy: Range;
  /** Sway / wander amplitude (px/s for drift-like motion, px for pendulum swing). */
  sway: Range;
  /** Sway frequency in rad/s. */
  swayFreq: Range;
  /** How much the theme wind moves this layer (0 = immune, 1 = full, >1 = light things). */
  windFactor: number;
  /** Colors cycled over particles (one sprite per color, per silhouette). */
  colors: readonly string[];
  /** Sprite softness 0 (sharp) .. 1 (fully out of focus). */
  blur?: number;
  /** Share of particles that twinkle (0..1). */
  twinkle?: number;
  /** Rotation speed range in rad/s. */
  spin?: Range;
  /** 3D tumble (scaleX flip) frequency in rad/s. */
  tumble?: Range;
  /** Gust-driven loop-the-loop radius in px/s (flutter). */
  swirl?: number;
  /** Vertical band as viewport fractions [top, bottom] (fog, twinkle, bats, glints). */
  band?: Range;
  /** Seconds between appearances (bat, shooting) or lifetime (glint). */
  interval?: Range;
  /** Additive blending for glowing particles. */
  additive?: boolean;
  /** Nearest-neighbour scaling and integer positions (pixel theme). */
  pixelated?: boolean;
}

/** Theme-wide wind: a slow base drift plus occasional gusts that move the whole field. */
export interface AmbientWindConfig {
  /** Base horizontal wind in px/s (sign = direction). */
  base: number;
  /** Peak extra wind of a gust in px/s. */
  gustStrength: number;
  /** Pause between gusts. */
  gustEvery: Range;
  /** Gust length. */
  gustDuration: Range;
}

/** Layers plus wind for one UI theme. */
export interface AmbientPack {
  layers: readonly AmbientLayerConfig[];
  wind: AmbientWindConfig;
}

export type DeviceTier = 'low' | 'mid' | 'high';

/** Density multiplier per device tier. */
export const TIER_DENSITY: Record<DeviceTier, number> = { low: 0.5, mid: 0.8, high: 1 };

/** Canvas resolution cap per tier (background particles never need more). */
export const TIER_MAX_DPR: Record<DeviceTier, number> = { low: 1, mid: 1.5, high: 1.5 };

/** Density multiplier under prefers-reduced-motion: one sparse static frame. */
export const REDUCED_MOTION_DENSITY = 0.3;

/** Behaviours dropped entirely under prefers-reduced-motion (they only make sense moving). */
export const MOTION_ONLY_BEHAVIOURS: readonly AmbientBehaviour[] = ['bat', 'shooting', 'glint', 'rain'];

/** Total particles across all layers of a pack. */
export const MAX_TOTAL_PARTICLES = 320;

/** Viewport area unit for densities (1 million CSS px²). */
export const DENSITY_AREA_UNIT = 1_000_000;

/** Longest simulated step; longer gaps (tab switch, jank) are clamped instead of jumping. */
export const MAX_FRAME_DT = 0.05;

/** Off-screen margin in px before a particle wraps / respawns. */
export const SPAWN_MARGIN = 48;

/** Seed so particle placement is stable between mounts. */
export const AMBIENCE_SEED = 1337;

/** Sprite canvas edge clamp in device px. */
export const SPRITE_MIN_PX = 8;
export const SPRITE_MAX_PX = 192;

/**
 * Packs per UI theme. Dark, light, forest and royal have none (only the --page-bg backdrop);
 * frost has a faint snow dust.
 */
export const SEASONAL_PACKS: Partial<Record<ThemePreference, AmbientPack>> = AMBIENCE_PACKS;

/**
 * Ambient layers per UI theme (kept for consumers that only ask "does this theme have
 * particles?", e.g. ClassicAmbienceOnly).
 */
export const SEASONAL_AMBIENCE: Partial<Record<ThemePreference, readonly AmbientLayerConfig[]>> =
  Object.fromEntries(Object.entries(AMBIENCE_PACKS).map(([theme, pack]) => [theme, pack.layers]));

/** Accent color used by SeasonalCorner / SeasonalDivider per theme (falls back to currentColor). */
export const SEASONAL_ORNAMENT_COLORS: Partial<Record<ThemePreference, { primary: string; secondary: string }>> = {
  halloween: { primary: '#ff7a1a', secondary: '#7a3ea8' },
  autumn: { primary: '#d9752b', secondary: '#e3a33a' },
  winter: { primary: '#cfe6ff', secondary: '#8fb8e0' },
  spring: { primary: '#e58bb0', secondary: '#6fae5a' },
  summer: { primary: '#ffb45c', secondary: '#22b8b0' },
};
