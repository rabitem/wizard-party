export const COLLECTION_ANIMATION_VARIANTS = [
  'classic',
  'bladeDance',
  'spiral',
  'comet',
] as const;

export type CollectionAnimationVariant = typeof COLLECTION_ANIMATION_VARIANTS[number];
export type CollectionAnimationMode = 'random' | CollectionAnimationVariant;

export interface CollectionAnimationProfile {
  id: CollectionAnimationVariant;
  name: string;
  description: string;
  trailColor: string;
  particleColor: string;
  trailLength: number;
  trailOpacity: number;
  particleCount: number;
  gatherArcMultiplier: number;
  flyArcMultiplier: number;
  pathAmplitude: number;
  waitDurationMultiplier: number;
  flyDurationMultiplier: number;
  /**
   * Shortest flight to the deck, in seconds. The path is shaped in flight progress, so its bend
   * per frame grows with 1 / duration²: a hop to a deck near the centre must still last long
   * enough to sweep through the variant's curves instead of whipping through them.
   */
  minFlyDuration: number;
  spinMultiplier: number;
  staggerMultiplier: number;
  settleDuration: number;
}

export interface CollectionAnimationPreset {
  id: CollectionAnimationMode;
  name: string;
  description: string;
}

export const COLLECTION_ANIMATION_PROFILES: Record<CollectionAnimationVariant, CollectionAnimationProfile> = {
  classic: {
    id: 'classic',
    name: 'Classic Sweep',
    description: 'Clean table sweep with subtle sparks',
    trailColor: '#f3c65b',
    particleColor: '#ffd782',
    trailLength: 10,
    trailOpacity: 0.28,
    particleCount: 18,
    gatherArcMultiplier: 1,
    flyArcMultiplier: 1,
    pathAmplitude: 1,
    waitDurationMultiplier: 1,
    flyDurationMultiplier: 1,
    minFlyDuration: 0.25,
    spinMultiplier: 1,
    staggerMultiplier: 1,
    settleDuration: 0.18,
  },
  bladeDance: {
    id: 'bladeDance',
    name: 'Blade Dance',
    description: 'Cards fan out, slash inward, and snap onto the stack',
    trailColor: '#9ee7ff',
    particleColor: '#d9fbff',
    trailLength: 18,
    trailOpacity: 0.48,
    particleCount: 34,
    gatherArcMultiplier: 0.75,
    flyArcMultiplier: 0.72,
    pathAmplitude: 2.15,
    waitDurationMultiplier: 1.35,
    flyDurationMultiplier: 1.08,
    minFlyDuration: 0.34,
    spinMultiplier: 2.35,
    staggerMultiplier: 1.05,
    settleDuration: 0.24,
  },
  spiral: {
    id: 'spiral',
    name: 'Astral Spiral',
    description: 'Cards orbit once before folding into the pile',
    trailColor: '#bda6ff',
    particleColor: '#eadfff',
    trailLength: 20,
    trailOpacity: 0.42,
    particleCount: 30,
    gatherArcMultiplier: 1.55,
    flyArcMultiplier: 1.15,
    pathAmplitude: 2.6,
    waitDurationMultiplier: 1.8,
    flyDurationMultiplier: 1.28,
    minFlyDuration: 0.38,
    spinMultiplier: 1.75,
    staggerMultiplier: 1.12,
    settleDuration: 0.26,
  },
  comet: {
    id: 'comet',
    name: 'Comet Cut',
    description: 'A higher arc with a bright arrival burst',
    trailColor: '#ffb86b',
    particleColor: '#ffe3a3',
    trailLength: 22,
    trailOpacity: 0.5,
    particleCount: 38,
    gatherArcMultiplier: 0.95,
    flyArcMultiplier: 2.25,
    pathAmplitude: 1.3,
    waitDurationMultiplier: 1.08,
    flyDurationMultiplier: 1.12,
    minFlyDuration: 0.28,
    spinMultiplier: 0.72,
    staggerMultiplier: 1.02,
    settleDuration: 0.28,
  },
};

/** Flight-path shaping of the collection variants (progress values are flight t in 0..1). */
export const COLLECTION_PATH_SHAPE = {
  // Blade Dance sweeps across the straight path over this window instead of flipping sides in one frame
  BLADE_DANCE_CUT_START: 0.25,
  BLADE_DANCE_CUT_END: 0.9,
  // Astral Spiral orbits exactly once per flight ("orbit once before folding into the pile")
  SPIRAL_ORBIT_TURNS: 1,
  // Orbit radius grows with the stack slot only up to this slot, so late cards of big tricks stay fluid
  SPIRAL_RADIUS_GROWTH_SLOTS: 3,
} as const;

/** Blade Dance waiting fan, centred on the middle card and bounded for 6-card tricks. */
export const BLADE_DANCE_FAN = {
  MAX_STEP_RAD: 0.64,
  MAX_HALF_SPAN_RAD: 0.95,
} as const;

/** Ghost trail behind flying cards. */
export const CARD_TRAIL = {
  // Samples are taken at a fixed rate so a trail covers the same time span at 30, 60 or 144 Hz
  SAMPLE_INTERVAL_S: 1 / 60,
  DEFAULT_LENGTH: 12,
} as const;

export const COLLECTION_ANIMATION_MODE_IDS: CollectionAnimationMode[] = [
  'random',
  ...COLLECTION_ANIMATION_VARIANTS,
];

export const COLLECTION_ANIMATION_PRESETS: CollectionAnimationPreset[] = [
  {
    id: 'random',
    name: 'Arcana Deck',
    description: 'Mixes the collection styles per card',
  },
  ...COLLECTION_ANIMATION_VARIANTS.map((variant) => {
    const profile = COLLECTION_ANIMATION_PROFILES[variant];

    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
    };
  }),
];
