/**
 * Autumn Harvest surroundings: a warm timber barn/lodge with hay, pumpkins,
 * apple crates, a fireplace and drifting leaves, lit by late-afternoon sun
 * shafts through the barn window. Table at the origin, local player at +z;
 * floor props stay outside radius ~4.6.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

export const AUTUMN_COLORS = {
  fog: '#1e130b',
  background: '#120a05',
  wallWood: '#6b4024',
  floorWood: '#6a4426',
  floorGrain: '#3c2312',
  beam: '#3a2414',
  ceiling: '#2a1a0e',
  stone: '#6a5e54',
  mortar: '#2a221c',
  hay: '#d8b056',
  hayDark: '#9a7430',
  hayLight: '#f0d58a',
  twine: '#7a5a2a',
  crate: '#9a6a3a',
  appleRed: '#b8261c',
  appleGreen: '#8aa83a',
  pumpkin: '#e0741a',
  pumpkinDeep: '#c4521a',
  gourdYellow: '#e8c04a',
  gourdWhite: '#eadfc8',
  gourdGreen: '#5f7a32',
  stem: '#5a4a22',
  ember: '#ff6a1a',
  flame: '#ffb347',
  fireGlow: '#ff7a24',
  lanternMetal: '#2a221c',
  lanternGlass: '#ffcf7a',
  lanternGlow: '#ffa040',
  sunset: '#ffb066',
  sunShaft: '#ffd49a',
  haze: '#d9ae78',
  corn: '#c9a24a',
  acornNut: '#8a5a2a',
  acornCap: '#5a3a1a',
  hemisphereSky: '#ffcf9a',
  hemisphereGround: '#1a0f08',
} as const;

export const AUTUMN_LEAF_COLORS = ['#d9531e', '#e8a33a', '#b8321c', '#c9861e', '#8a3a14', '#e0c04a'] as const;

export const AUTUMN_LIGHTS = {
  /** Positioned inside the fireplace group (see Fireplace.tsx) */
  fire: { color: '#ff8a3a', intensity: 2.2, distance: 14 },
  lantern: { position: [6, 2.4, -6] as Vec3, color: '#ffb766', intensity: 1.1, distance: 12 },
  hemisphereIntensity: 0.34,
} as const;

export const AUTUMN_LAYOUT = {
  RAFTER_COUNT: 7,
  /** Upright posts under the purlins (x = +-6): [x, z] */
  POSTS: [
    [-6, -9],
    [6, -9],
    [-6, 6],
    [6, 6],
  ] as ReadonlyArray<[number, number]>,
  /** Fireplace on the left wall */
  FIREPLACE_POSITION: [-15.6, FLOOR, -3] as Vec3,
  FIREPLACE_ROTATION: Math.PI / 2,
  /** Barn window on the back wall (glowing sunset) */
  WINDOW_CENTER: [0, FLOOR + 4.2, -14.95] as Vec3,
  WINDOW_SIZE: [5, 2.6] as [number, number],
  /** GPU leaf field (base count on a high-tier device; scaled down per tier) */
  LEAF_COUNT: 90,
  LEAF_AREA: { center: [0, FLOOR, -2] as Vec3, halfSize: [11, 9] as [number, number], top: FLOOR + 8.5, bottom: FLOOR + 0.05 },
  LEAF_WIND: [0.22, 0, 0.1] as const,
} as const;

/** Outdoor view through the barn window: low sun over golden fields and turning woods. */
export const AUTUMN_WINDOW_VIEW = {
  skyTop: '#3d3a6e',
  skyHorizon: '#ffb070',
  snow: '#d6a659',
  mountain: '#7a5a78',
  treeFar: '#8a3f1c',
  treeNear: '#552711',
  celestial: '#ffe0a6',
  frost: '#fff0dc',
  stars: 0,
  celestialPosition: [-0.32, 0.06] as const,
  celestialSize: 0.11,
  brightness: 1.3,
} as const;

/**
 * Sun shafts: one per window pane, falling steeply enough to land well
 * behind the table (ends stay beyond z = -5.5).
 */
const SUN_RUN: Vec3 = [2.4, 0, 7.4];
const PANE_CENTERS: ReadonlyArray<readonly [number, number]> = [
  [-1.25, 4.85],
  [1.25, 4.85],
  [-1.25, 3.55],
  [1.25, 3.55],
];
export const AUTUMN_SUN_SHAFTS = PANE_CENTERS.map(([x, height]) => ({
  source: [x, FLOOR + height, -15.2] as Vec3,
  target: [x + SUN_RUN[0], FLOOR, -15.2 + SUN_RUN[2]] as Vec3,
  radiusStart: 0.55,
  radiusEnd: 1.15,
}));

export const AUTUMN_ATMOSPHERE_FX = {
  SHAFT_INTENSITY: 0.2,
  DUST_COUNT: 150,
  DUST_VOLUME: { center: [1.4, FLOOR, -11] as Vec3, halfSize: [3.4, 3.8] as const, bottom: FLOOR + 0.2, top: FLOOR + 5.4 },
  /** Warm haze over the back half of the barn floor (kept away from the seats) */
  HAZE: { center: [0, FLOOR, -8.5] as Vec3, size: [30, 13] as const, height: 0.55, opacity: 0.2 },
  /** Sparks rising from the hearth (fireplace-local volume) */
  EMBER_COUNT: 50,
} as const;

/** Hay bales: [x, y-level (0 = floor), z, rotationY]. Stacks use level 1. */
export const AUTUMN_HAY_BALES: ReadonlyArray<[number, number, number, number]> = [
  [-11.5, 0, -11.5, 0.1],
  [-9.9, 0, -11.8, -0.05],
  [-10.7, 1, -11.6, 0.3],
  [11.4, 0, -11.2, -0.15],
  [12.2, 0, -9.6, 1.4],
  [11.6, 1, -10.6, 0.2],
  [12, 0, 7, 0.4],
  [-12.5, 0, 8, -0.3],
  [5.8, 0, -7.2, 0.6],
];

/** Pumpkins and gourds: [x, z, scale, rotationY, colorKey, elongation]. */
export const AUTUMN_PUMPKINS: ReadonlyArray<[number, number, number, number, keyof typeof AUTUMN_COLORS, number]> = [
  [-5.4, -4.4, 1.3, 0.4, 'pumpkin', 1],
  [-6.4, -3.3, 0.8, 1.2, 'pumpkinDeep', 1],
  [-4.8, -5.6, 0.55, 0.2, 'gourdYellow', 1.5],
  [-6.0, -5.2, 0.5, 2.1, 'gourdWhite', 1],
  [5.0, -5.0, 1.0, -0.4, 'pumpkin', 1],
  [4.4, -6.0, 0.45, -1.1, 'gourdGreen', 1.6],
  [6.6, 3.0, 1.1, -1.3, 'pumpkinDeep', 1],
  [7.3, 3.9, 0.5, 0.6, 'gourdYellow', 1.4],
  [-6.8, 3.4, 0.9, 1.0, 'pumpkin', 1],
  [-7.4, 2.4, 0.45, 0.4, 'gourdWhite', 1],
  [-11.0, -10.2, 0.9, 0.3, 'pumpkin', 1],
  [-12.2, -9.8, 0.6, 0.9, 'gourdYellow', 1],
  [10.2, -10.4, 0.8, -0.2, 'pumpkinDeep', 1],
  [0.8, -10.4, 1.4, 0.05, 'pumpkin', 1],
  [-1.4, -10.0, 0.7, 0.5, 'gourdGreen', 1.5],
];

/** Apple crates: [x, z, rotationY, stacked]. */
export const AUTUMN_CRATES: ReadonlyArray<[number, number, number, boolean]> = [
  [8.6, -8.6, 0.3, true],
  [-8.4, -8.8, -0.2, false],
  [13.2, 2.6, 1.3, false],
  [-3.2, -11.6, 0.1, false],
];

/** Floor / prop-top lanterns: [x, y, z, scale]. */
export const AUTUMN_LANTERNS: ReadonlyArray<[number, number, number, number]> = [
  [-5.0, FLOOR, -3.4, 1.1],
  [5.6, FLOOR, -4.3, 1.0],
  [-10.7, FLOOR + 1.2, -11.6, 0.9],
  [11.6, FLOOR + 1.2, -10.6, 0.9],
  [8.6, FLOOR + 1.2, -8.6, 0.8],
  [-6.4, FLOOR, 4.2, 1.0],
  [7.0, FLOOR, 4.6, 1.0],
];

/** Lanterns hanging from rafters on short chains: [x, y, z]. */
export const AUTUMN_HANGING_LANTERNS: ReadonlyArray<Vec3> = [
  [-6, FLOOR + 6.6, -6.4],
  [6, FLOOR + 6.6, -6.4],
  [0, FLOOR + 6.9, -10.6],
];

/** Corn shocks leaning against the posts: [x, z, scale]. */
export const AUTUMN_CORN_SHOCKS: ReadonlyArray<[number, number, number]> = [
  [-6.6, -8.5, 1.1],
  [6.6, -8.5, 1.0],
  [-6.6, 6.5, 0.9],
  [6.6, 6.5, 0.95],
];

/** Rim decor: leaves scattered around two slots, acorns in the others. */
const RIM_LEAF_SLOTS = [162, 198, 30] as const;
const RIM_ACORN_SLOTS = [330, 162] as const;
const LEAF_OFFSETS: ReadonlyArray<[number, number, number]> = [
  // [angle offset deg, radial offset, rotation]
  [-4, -0.08, 0.4],
  [0, 0.06, 2.1],
  [4, -0.02, 4.0],
];
export const AUTUMN_RIM_LEAVES = RIM_LEAF_SLOTS.flatMap((slot, s) =>
  LEAF_OFFSETS.map(([da, dr, rot], i) => ({
    position: getRimPosition(slot + da, dr, 0.006 + i * 0.002),
    rotationY: rot + s,
    color: AUTUMN_LEAF_COLORS[(s * 3 + i) % AUTUMN_LEAF_COLORS.length],
  })),
);
export const AUTUMN_RIM_ACORNS = RIM_ACORN_SLOTS.flatMap((slot) => [
  { position: getRimPosition(slot - 1.5, 0.08), rotationY: getRimFacingRotation(slot) },
  { position: getRimPosition(slot + 1.8, -0.05), rotationY: getRimFacingRotation(slot) + 1.2 },
]);
export const AUTUMN_RIM_LEAF_SCALE = 0.9;
export const AUTUMN_RIM_ACORN_SCALE = 0.9;
