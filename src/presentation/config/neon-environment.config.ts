/**
 * Neon Night surroundings: a rain-wet rooftop at night above a synthwave
 * city. Glowing grid horizon, a striped retro sunset disc, skyline
 * silhouettes with lit windows, neon tube signs, holographic billboards and
 * emissive floor streaks faking wet reflections. Table at the origin, local
 * player at +z (the sunset lies behind the far side of the table).
 *
 * Everything distant stays inside the camera far plane (100) even at max
 * orbit distance (14), so the furthest geometry sits within ~82 units.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

export const NEON_COLORS = {
  fog: '#1a0830',
  deck: '#0b0914',
  parapet: '#120c22',
  cyan: '#22e5ff',
  magenta: '#ff3fd2',
  violet: '#9b5cff',
  amber: '#ffb02e',
  mint: '#3dffa8',
  building: '#0d0820',
  buildingFar: '#1c0c36',
  windowWarm: '#ffcf7a',
  windowCool: '#7fe8ff',
  windowPink: '#ff8ae0',
  gridLine: '#ff3fd2',
  gridGlow: '#7a1a8a',
  pole: '#1a1626',
  hemisphereSky: '#5a2a9a',
  hemisphereGround: '#0a1a2a',
} as const;

/** Night sky dome stops (zenith -> horizon). */
export const NEON_SKY_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#04020c'],
  [0.45, '#140632'],
  [0.72, '#3a0c5a'],
  [0.88, '#8a1a7a'],
  [1, '#ff5ab0'],
];

/** Retro sun disc stops (top -> bottom). */
export const NEON_SUN_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#fff27a'],
  [0.4, '#ffb02e'],
  [0.7, '#ff5a8a'],
  [1, '#ff2fd2'],
];

/** Point lights: magenta and cyan neon spill, no shadows (max 2). */
export const NEON_LIGHTS = {
  magenta: { position: [-7, 4.5, -6] as Vec3, color: '#ff3fd2', intensity: 1.4, distance: 22 },
  cyan: { position: [7, 4.5, -2] as Vec3, color: '#22e5ff', intensity: 1.2, distance: 22 },
  /** Soft neutral-violet fill so cards stay readable */
  hemisphereIntensity: 0.55,
} as const;

export const NEON_LAYOUT = {
  FOG: { NEAR: 20, FAR: 95 },
  SKY_RADIUS: 80,
  /** Rooftop deck footprint (half extents) and parapet */
  DECK_HALF: 13,
  DECK_THICKNESS: 0.4,
  PARAPET_HEIGHT: 0.85,
  PARAPET_DEPTH: 0.35,
  /** Grid lines painted on the wet deck */
  DECK_GRID_REPEAT: 13,
  /** Synthwave grid plane far below the roof */
  GRID_Y: FLOOR - 9,
  GRID_SIZE: [150, 120] as [number, number],
  GRID_CENTER_Z: -24,
  GRID_REPEAT: [30, 24] as [number, number],
  /** Grid cells per second the grid scrolls towards the camera */
  GRID_SCROLL_SPEED: 0.25,
  /** Sun centre; its lower edge dips below the grid plane like a setting sun */
  SUN_POSITION: [0, FLOOR + 3, -72] as Vec3,
  SUN_RADIUS: 15,
  /** Sunset reflection streak on the grid plane */
  SUN_STREAK: { WIDTH: 16, LENGTH: 44, OPACITY: 0.38 },
  /** Skyline ring: buildings stand on the grid plane */
  SKYLINE: {
    COUNT_NEAR: 26,
    COUNT_FAR: 22,
    RADIUS_NEAR: [32, 46] as [number, number],
    RADIUS_FAR: [54, 66] as [number, number],
    WIDTH: [3, 7] as [number, number],
    HEIGHT_NEAR: [9, 22] as [number, number],
    HEIGHT_FAR: [14, 30] as [number, number],
    /** Keep the sunset clear: no buildings within this half width behind the table */
    SUN_GAP_HALF_X: 17,
    SEED: 2077,
  },
  /** Wet-floor reflection streak under each sign */
  REFLECTION_LENGTH: 4.2,
  REFLECTION_OPACITY: 0.38,
  TUBE_RADIUS: 0.045,
  /** Billboard scanline scroll speed (texture repeats per second) */
  SCANLINE_SPEED: 0.35,
} as const;

export type NeonSignShape = 'moon' | 'bolt' | 'hat' | 'diamond' | 'star';

export interface NeonSignLayout {
  shape: NeonSignShape;
  color: keyof typeof NEON_COLORS;
  position: Vec3;
  rotationY: number;
  scale: number;
  /** Phase for the flicker; a broken tube flickers harder */
  phase: number;
  faulty?: boolean;
}

/** Neon tube signs on frames around the roof (no lettering, no brands). */
export const NEON_SIGNS: readonly NeonSignLayout[] = [
  { shape: 'moon', color: 'magenta', position: [-5.5, FLOOR + 3.6, -12.3], rotationY: 0, scale: 1.5, phase: 0 },
  { shape: 'star', color: 'amber', position: [-3.1, FLOOR + 4.4, -12.3], rotationY: 0, scale: 0.8, phase: 1.3, faulty: true },
  { shape: 'hat', color: 'cyan', position: [5.5, FLOOR + 3.4, -12.3], rotationY: 0, scale: 1.7, phase: 2.1 },
  { shape: 'bolt', color: 'amber', position: [-12.3, FLOOR + 3, -3], rotationY: Math.PI / 2, scale: 1.4, phase: 3.4 },
  { shape: 'diamond', color: 'mint', position: [12.3, FLOOR + 3, -4], rotationY: -Math.PI / 2, scale: 1.3, phase: 4.2 },
  { shape: 'star', color: 'violet', position: [12.3, FLOOR + 3.2, 5], rotationY: -Math.PI / 2, scale: 1.1, phase: 5.5 },
];

export interface BillboardLayout {
  position: Vec3;
  rotationY: number;
  size: [number, number];
  variant: 'spell' | 'cards';
}

/** Holographic billboards floating above nearby towers. */
export const NEON_BILLBOARDS: readonly BillboardLayout[] = [
  { position: [-24, FLOOR + 9, -30], rotationY: 0.55, size: [10, 5.6], variant: 'spell' },
  { position: [26, FLOOR + 7.5, -26], rotationY: -0.6, size: [9, 5], variant: 'cards' },
];

/** Rooftop clutter: AC units and vents as instanced boxes [x, z, w, h, d]. */
export const NEON_ROOF_UNITS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-10.2, -9.6, 1.8, 1.1, 1.4],
  [-8.1, -10.4, 1.2, 0.8, 1.2],
  [9.8, -9.8, 2.2, 1.3, 1.6],
  [10.6, 8.6, 1.4, 0.9, 1.4],
  [-10.8, 7.4, 1.6, 1.0, 1.2],
];

/** Rim decor slots (visual only, outside the play area). */
export const NEON_RIM_DECOR = {
  projector: { position: getRimPosition(30), rotationY: getRimFacingRotation(30) },
  cocktail: { position: getRimPosition(162), rotationY: getRimFacingRotation(162) },
  cassette: { position: getRimPosition(198, 0, 0.012), rotationY: getRimFacingRotation(198) + 0.35 },
  glowStick: { position: getRimPosition(330, 0, 0.012), rotationY: getRimFacingRotation(330) + 1.2 },
} as const;

/**
 * Realism pass: GPU rain with splash ripples on the wet deck, steam from the
 * roof units, depth haze between the skyline rings and blinking aviation
 * lights. Counts are high-tier values; the realism toolkit scales them down.
 */
export const NEON_REALISM = {
  RAIN: {
    COUNT: 720,
    VOLUME: { center: [0, FLOOR, 0] as Vec3, halfSize: [12.6, 12.6] as const, bottom: FLOOR, top: FLOOR + 10 },
    /** Drops pick up the neon around them */
    COLORS: ['#cfe9ff', '#a8dcff', '#ffc4ef', '#e2f2ff'] as const,
    WIND: [0.9, 0, 0.3] as const,
    FALL_SPEED: 8.5,
    OPACITY: 0.9,
    SEED: 31,
  },
  /** Procedural splash rings on the deck (one shader plane) */
  RIPPLES: {
    /** World size of one ripple cell (at most one ring per cell at a time) */
    CELL: 1.15,
    /** Ring cycles per second */
    RATE: 0.9,
    /** Share of cells that splash */
    DENSITY: 0.6,
    /** Largest ring radius in cell units (rings stay inside their cell) */
    MAX_RADIUS: 0.24,
    COLOR: '#cfe6ff',
    OPACITY: 0.45,
    /** Keep-clear radius around the table (matches the rain clear zone) */
    CLEAR_RADIUS: 3.4,
    /** Fade rings out with camera distance to avoid shimmer */
    FADE_DISTANCE: [10, 22] as const,
    LIFT: 0.004,
  },
  STEAM: {
    /** Indices into NEON_ROOF_UNITS that vent steam */
    UNITS: [0, 2, 3] as const,
    PUFFS_PER_VENT: { low: 5, medium: 8, high: 12 },
    RISE: 2.8,
    LIFETIME: 4.6,
    /** Puff size at birth / end of life */
    SIZE: [0.45, 1.9] as const,
    /** Drift (x, z) over a puff lifetime */
    DRIFT: [0.7, 0.25] as const,
    COLOR: '#c9b8e8',
    OPACITY: 0.3,
  },
  /** Open haze cylinders around the roof: [radius, height, colour, opacity] */
  HAZE: [
    { radius: 50, height: 20, color: '#3a1260', opacity: 0.6 },
    { radius: 69, height: 30, color: '#7a1f78', opacity: 0.5 },
  ],
  AIRCRAFT: {
    BEACON: { color: '#ff2a3a', size: 9, period: 2.4, duty: 0.35, floor: 0.12 },
    NAV_SIZE: 5,
    STROBE: { color: '#ffffff', size: 8, period: 1.3, duty: 0.12 },
    NAV_COLORS: ['#ff3b3b', '#3bff7a'] as const,
    /** Wing half span of the nav lights */
    WING: 0.9,
    /** Planes crossing the sky: start, velocity (units/s), loop length (s) */
    PLANES: [
      { start: [-60, FLOOR + 26, -46] as Vec3, velocity: [3.2, 0, 0.35] as Vec3, loop: 38, offset: 0 },
      { start: [58, FLOOR + 33, -20] as Vec3, velocity: [-2.6, 0.05, -0.6] as Vec3, loop: 44, offset: 17 },
      { start: [-30, FLOOR + 38, 52] as Vec3, velocity: [1.4, 0, -2.4] as Vec3, loop: 40, offset: 9 },
    ],
  },
  /** Neon colours above 1 so the bloom pass picks them up */
  BLOOM_BOOST: { TUBES: 2.2, STRIPS: 1.7, SCREENS: 1.25 },
  DECK: { COLOR: '#17131f', ACCENT: '#08060d', REPEAT: [5, 5] as const, ROUGHNESS: 0.45, METALNESS: 0.35, NORMAL_SCALE: 0.3 },
  /** Faulty tube: share of each cycle spent stuttering, cycle speed (1/s) */
  STUTTER: { SHARE: 0.16, SPEED: 0.3, OFF_LEVEL: 0.06 },
} as const;
