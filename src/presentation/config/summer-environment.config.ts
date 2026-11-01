/**
 * Summer surroundings: a sunlit wooden terrace by the sea at sunset. Deck
 * and railing, sand, an open horizon with shimmering water, palms, beach
 * umbrellas, loungers, surfboards and tiki torches. Table at the origin,
 * local player at +z (the sea lies behind the far side of the table).
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

export const SUMMER_COLORS = {
  fog: '#f0b48a',
  deck: '#9a6a44',
  rail: '#e8dcc4',
  sand: '#e2c48e',
  sea: '#1f5f7a',
  seaHighlight: '#ffd2a0',
  island: '#3a2c48',
  sun: '#fff0b0',
  sunGlow: '#ffb060',
  palmTrunk: '#8a6a44',
  frond: '#3a8a3e',
  frondDark: '#2a6a32',
  coconut: '#5a3a1e',
  umbrellaPole: '#f2ece0',
  loungerFrame: '#f2ece0',
  bamboo: '#c8a060',
  torchHead: '#4a3420',
  torchFlame: '#ffb347',
  torchGlow: '#ff8a3a',
  glass: '#e8f6ff',
  lemonade: '#ffe27a',
  lemon: '#ffd83a',
  straw: '#e8323a',
  ice: '#f0faff',
  hemisphereSky: '#ffd6a8',
  hemisphereGround: '#5a4030',
} as const;

/** Sunset sky dome stops (zenith -> horizon). */
export const SUMMER_SKY_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#2a3a7a'],
  [0.35, '#7a4a8a'],
  [0.62, '#e8708a'],
  [0.82, '#ffa860'],
  [0.94, '#ffd890'],
  [1, '#ffe8b0'],
];

export const SUMMER_STRIPES = [
  ['#e8323a', '#f8f4ea'],
  ['#2a8ac8', '#f8f4ea'],
] as const;
export const SUMMER_LOUNGER_FABRICS = ['#2a8ac8', '#f2a03a', '#e8323a', '#3aa88a'] as const;
export const SUMMER_SURFBOARD_COLORS = ['#38b8c8', '#f2783a'] as const;
export const SUMMER_SHELL_COLORS = ['#f8e2d0', '#f2c0a8', '#fff2e4', '#e8a888'] as const;

export const SUMMER_LIGHTS = {
  /** Low sunset sun over the sea */
  sun: { position: [0, 4, -12] as Vec3, color: '#ffa860', intensity: 1.35, distance: 32 },
  /** Cool sea-reflected fill from the camera side */
  fill: { position: [0, 4, 9] as Vec3, color: '#9ad8e8', intensity: 0.38, distance: 18 },
  hemisphereIntensity: 0.42,
} as const;

export const SUMMER_LAYOUT = {
  /** Deck footprint (x half width, z range) */
  DECK_HALF_WIDTH: 11,
  DECK_Z: [-11, 16] as [number, number],
  DECK_THICKNESS: 0.35,
  RAIL_HEIGHT: 1.0,
  RAIL_POST_SPACING: 1.6,
  /** Gap in the back railing for the beach steps (half width) */
  RAIL_GAP_HALF: 1.4,
  SAND_Y: FLOOR - 0.45,
  SAND_Z: [-20, 40] as [number, number],
  SEA_Y: FLOOR - 0.6,
  SEA_Z: [-20, -82] as [number, number],
  SEA_WIDTH: 180,
  /** Stays inside the camera far plane (100) even at max orbit distance */
  SKY_RADIUS: 80,
  SUN_POSITION: [0, FLOOR + 6, -74] as Vec3,
  SUN_RADIUS: 6,
  /** Distant islands on the horizon: [x, z, width, height] */
  ISLANDS: [
    [-40, -64, 22, 4.5],
    [-22, -74, 12, 2.6],
    [34, -68, 26, 5.5],
    [48, -58, 14, 3],
  ] as ReadonlyArray<[number, number, number, number]>,
  /** Palms: [x, z, height, leanAngle, leanAmount] */
  PALMS: [
    [-13.6, -14.2, 7.4, 2.2, 1.6],
    [-16.4, -5.2, 6.4, 3.0, 1.2],
    [14.2, -15.0, 8.0, 0.9, 1.8],
    [17.0, -4.0, 6.2, 0.2, 1.1],
    [-15.8, 7.0, 6.8, 3.6, 1.4],
    [16.0, 8.4, 7.0, -0.4, 1.3],
  ] as ReadonlyArray<[number, number, number, number, number]>,
  FRONDS_PER_PALM: 7,
  /** Beach umbrellas: [x, z, tilt, stripe scheme index] */
  UMBRELLAS: [
    [-7.4, -7.6, 0.12, 0],
    [7.8, -7.0, -0.1, 1],
  ] as ReadonlyArray<[number, number, number, number]>,
  /** Loungers face the sea (-z): [x, z, rotationY] */
  LOUNGERS: [
    [-8.6, -6.4, 0.1],
    [-6.2, -6.6, -0.05],
    [6.8, -5.9, 0.05],
    [9.2, -6.0, -0.12],
  ] as ReadonlyArray<[number, number, number]>,
  /** Surfboards leaning on a side railing: [x, z] (x = railing line) */
  SURFBOARDS: [
    [-11, 3.2],
    [-11, 4.1],
  ] as ReadonlyArray<[number, number]>,
  TIKI_TORCHES: [
    [-10.4, -10.4],
    [10.4, -10.4],
    [-2.2, -10.4],
    [2.2, -10.4],
    [-10.4, -1.5],
    [10.4, -1.5],
    [-10.4, 8],
    [10.4, 8],
  ] as ReadonlyArray<[number, number]>,
  SEA_SHIMMER_SPEED: 0.012,
} as const;

/** Rim decor: lemonade glass at one slot, seashells and a starfish at the others. */
export const SUMMER_RIM_GLASS = { position: getRimPosition(30), rotationY: getRimFacingRotation(30) };
export const SUMMER_RIM_SCALLOPS = [
  { position: getRimPosition(160, 0.04, 0.012), rotationY: getRimFacingRotation(160) + 0.4, color: SUMMER_SHELL_COLORS[0] },
  { position: getRimPosition(165, -0.06, 0.012), rotationY: getRimFacingRotation(165) - 0.8, color: SUMMER_SHELL_COLORS[1] },
  { position: getRimPosition(201, 0.03, 0.012), rotationY: getRimFacingRotation(201) + 2.1, color: SUMMER_SHELL_COLORS[2] },
];
export const SUMMER_RIM_CONCHS = [{ position: getRimPosition(196, -0.04, 0.03), rotationY: getRimFacingRotation(196) + 1.2, color: SUMMER_SHELL_COLORS[3] }];
export const SUMMER_RIM_STARFISH = [{ position: getRimPosition(330, 0, 0.006), rotationY: 0.5, color: '#f2884a' }];

// =============================================================================
// REALISM PASS (sky shader, sea shader, palm wind, torch fire, motes)
// =============================================================================

/** Procedural sunset sky drawn on the dome (gradient from SUMMER_SKY_STOPS). */
export const SUMMER_SKY = {
  DOME_SEGMENTS: [40, 16] as [number, number],
  /** Sun disc multiplier: above 1 so the bloom pass catches it */
  SUN_INTENSITY: 3.4,
  GLOW_COLOR: '#ff9450',
  HAZE_COLOR: '#ffd6a6',
  CLOUD_LIT: '#ffc48a',
  CLOUD_SHADE: '#6e4474',
  /** 0..1 share of the sky band covered by thin sunset streaks */
  CLOUD_COVER: 0.45,
  CLOUD_DRIFT: 0.004,
  /** Heat-haze wobble of the horizon and sun (direction offset) */
  HAZE_SHIMMER: 0.0022,
} as const;

/** Shader sea: two-scale normal detail, Fresnel sky reflection, sun glitter, shore foam. */
export const SUMMER_SEA = {
  DEEP: '#0b2c44',
  SHALLOW: '#1d6378',
  FOAM: '#fff1de',
  /** Peak brightness of the sun glints (above 1 blooms) */
  GLITTER: 7,
  /** Broad sun path on the water */
  SUN_PATH: 0.32,
  /** Normal detail strength of the large and small noise layers */
  DETAIL: [0.16, 0.09] as [number, number],
  DETAIL_SCALE: [0.055, 0.2] as [number, number],
  /** Width (units) of the foam band where the sea meets the sand */
  FOAM_WIDTH: 2.4,
} as const;

/** Palm fronds sway in the vertex shader (one time uniform). */
export const SUMMER_WIND = {
  FROND_SWAY: 0.34,
  FROND_FLUTTER: 0.035,
  SPEED: 1,
} as const;

/** Billboard tiki flames, rising embers and one flickering warm light. */
export const SUMMER_TORCH_FIRE = {
  FLAME_SIZE: [0.36, 0.66] as [number, number],
  CORE: '#fff3c4',
  MID: '#ffa236',
  EDGE: '#d8401a',
  /** Flame brightness (above 1 blooms) */
  INTENSITY: 2.4,
  EMBERS_PER_TORCH: 12,
  EMBER_RISE: 2.6,
  EMBER_RATE: 0.32,
  EMBER_SIZE: 0.075,
  EMBER_HOT: '#ffd27a',
  EMBER_COOL: '#ff5a1e',
  /** One shadowless light between the back torches (third point light of the room) */
  LIGHT: { position: [0, FLOOR + 2.6, -9.6] as Vec3, color: '#ff9446', intensity: 1.5, distance: 11 },
} as const;

/** Warm sun motes drifting over the deck (RealisticParticleField 'dust'). */
export const SUMMER_MOTES = {
  COUNT: 150,
  VOLUME: { center: [0, FLOOR, -2] as Vec3, halfSize: [10, 9] as [number, number], bottom: FLOOR + 0.2, top: FLOOR + 5.5 },
  COLORS: ['#ffe2b0', '#ffd08a', '#fff2d8'] as const,
  WIND: [0.06, 0.01, 0.03] as [number, number, number],
} as const;
