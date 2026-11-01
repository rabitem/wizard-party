/**
 * Winter surroundings: a cozy alpine lodge at night. Log walls, frosted
 * windows with a parallax snowy forest, an open archway onto a covered porch
 * with heavy snowfall (see winter-porch.config.ts), a decorated pine, a
 * crackling fireplace, a snowman, gifts, icicles and candles. Table at the
 * origin, local player at +z; floor props stay outside radius ~5.5 so they
 * never crowd the table.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
/** Just in front of the back wall so window panes never z-fight with it */
const BACK_WALL_Z = -ENVIRONMENT_ROOM.HALF_DEPTH + 0.04;

export const WINTER_COLORS = {
  fog: '#161e2c',
  logWall: '#7a5232',
  logWallGrain: '#4a2e1a',
  floorWood: '#6a472c',
  floorGrain: '#3e2616',
  ceiling: '#2e2016',
  beam: '#3a2818',
  rug: '#8a2228',
  rugInner: '#6a181c',
  rugBorder: '#e2d2a6',
  windowFrame: '#2a1c12',
  snow: '#eef4fa',
  snowShadow: '#b9c9e2',
  ice: '#d6ecff',
  stone: '#8a827c',
  mortar: '#2c2826',
  mantel: '#4a3020',
  soot: '#120c08',
  log: '#4a2c16',
  logGlow: '#5a1a04',
  flame: '#ffb347',
  ember: '#ff6a1a',
  fireGlow: '#ff8a3a',
  pineDark: '#1c4429',
  pine: '#245834',
  pineLight: '#326c42',
  trunk: '#4a2e1a',
  treeSkirt: '#a8242c',
  star: '#ffe27a',
  starGlow: '#ffd24a',
  ornamentGlow: '#fff2c8',
  snowman: '#f4f8fc',
  coal: '#16161a',
  carrot: '#ff7a1a',
  scarf: '#c8242c',
  hat: '#1a1a20',
  twig: '#4a3020',
  stocking: '#b81c24',
  stockingAlt: '#2a6a3a',
  stockingCuff: '#f4f0e8',
  garland: '#24552f',
  berry: '#d01c24',
  pineCone: '#6a4426',
  wax: '#f4ead4',
  candleFlame: '#ffd27a',
  candleGlow: '#ff9a3c',
  hemisphereSky: '#a8c4e0',
  hemisphereGround: '#1a120c',
} as const;

export const WINTER_ORNAMENT_COLORS = ['#ff3a44', '#ffd24a', '#4aa8ff', '#f4f4ff', '#d25aff', '#4ae89a'] as const;
export const WINTER_GIFT_COLORS = ['#c8242c', '#2a6a3a', '#2a4a9a', '#e8d8b0', '#7a2a8a', '#d8a020'] as const;
export const WINTER_RIBBON_COLORS = ['#f4d24a', '#f4f0e8', '#c8242c', '#2a6a3a', '#f4d24a', '#c8242c'] as const;

export const WINTER_LIGHTS = {
  /** Positioned inside the fireplace group (see LodgeFireplace.tsx) */
  fire: { color: '#ff8a3a', intensity: 2.4, distance: 16 },
  /** Cold moonlight pouring in through the porch archway */
  moon: { position: [0, 4.2, -13.2] as Vec3, color: '#9cbcff', intensity: 1.4, distance: 20 },
  hemisphereIntensity: 0.24,
} as const;

export interface WinterWindow {
  center: Vec3;
  size: [number, number];
}

export const WINTER_LAYOUT = {
  BEAM_COUNT: 6,
  /** Corner and mid-wall log posts: [x, z] */
  POSTS: [
    [-15.6, -14.6],
    [15.6, -14.6],
    [-15.6, 14.6],
    [15.6, 14.6],
  ] as ReadonlyArray<[number, number]>,
  WINDOWS: [
    { center: [-8.6, FLOOR + 3.8, BACK_WALL_Z], size: [2.6, 3.2] },
    { center: [8.6, FLOOR + 3.8, BACK_WALL_Z], size: [2.6, 3.2] },
  ] as ReadonlyArray<WinterWindow>,
  /** Frost creeping in from the pane edges (0..1) */
  WINDOW_FROST: 0.62,
  ICICLES_PER_WINDOW: 7,
  RUG_RADIUS: 5.4,
  FIREPLACE_POSITION: [-15.55, FLOOR, -2.5] as Vec3,
  FIREPLACE_ROTATION: Math.PI / 2,
  /** Rising sparks above the hearth (GPU particles, scaled per device tier) */
  EMBER_COUNT: 46,
  TREE_POSITION: [10.2, FLOOR, -9.8] as Vec3,
  TREE_HEIGHT: 6.4,
  TREE_RADIUS: 2.3,
  ORNAMENT_COUNT: 30,
  /** Ornaments that also get a soft halo sprite */
  ORNAMENT_GLOW_EVERY: 3,
  SNOWMAN_POSITION: [-9.4, FLOOR, -10.2] as Vec3,
  SNOWMAN_ROTATION: 0.5,
} as const;

/** Gifts under the tree: [x, z, width, height, depth, rotationY]. */
export const WINTER_GIFTS: ReadonlyArray<[number, number, number, number, number, number]> = [
  [8.4, -8.4, 0.7, 0.5, 0.6, 0.3],
  [9.4, -7.6, 0.5, 0.7, 0.5, -0.4],
  [11.6, -8.0, 0.8, 0.4, 0.8, 0.9],
  [12.0, -9.0, 0.45, 0.45, 0.45, 0.2],
  [10.4, -7.4, 0.55, 0.35, 0.9, 1.2],
  [8.9, -9.6, 0.4, 0.6, 0.4, 0.7],
];

/** Candles on the window sills, relative to each window's sill centre: [dx, heightScale]. */
export const WINTER_SILL_CANDLES: ReadonlyArray<[number, number]> = [
  [-0.6, 1.4],
  [-0.35, 0.9],
  [0.55, 1.2],
];

/** Candles on the mantel (fireplace-local x offsets, height scale). */
export const WINTER_MANTEL_CANDLES: ReadonlyArray<[number, number]> = [
  [-1.4, 1.6],
  [-1.15, 1.0],
  [1.2, 1.3],
  [1.45, 0.8],
];

/** Rim decor: tiny candles at two safe slots, pine cones at the other two. */
const RIM_CANDLE_SLOTS = [30, 330] as const;
const RIM_CONE_SLOTS = [162, 198] as const;
export const WINTER_RIM_CANDLE_SCALE = 0.55;
export const WINTER_RIM_CANDLES = RIM_CANDLE_SLOTS.flatMap((slot) => [
  { position: getRimPosition(slot - 2, 0.04), scale: WINTER_RIM_CANDLE_SCALE, height: 1.3 },
  { position: getRimPosition(slot + 2.2, -0.05), scale: WINTER_RIM_CANDLE_SCALE, height: 0.8 },
]);
export const WINTER_RIM_CONE_SCALE = 0.8;
export const WINTER_RIM_CONES = RIM_CONE_SLOTS.flatMap((slot, s) => [
  { position: getRimPosition(slot - 2.5, 0.05, 0.03), rotationY: getRimFacingRotation(slot) + s, tilt: [Math.PI / 2, 0] as [number, number] },
  { position: getRimPosition(slot + 1, -0.06), rotationY: getRimFacingRotation(slot) },
  { position: getRimPosition(slot + 3.5, 0.06, 0.03), rotationY: getRimFacingRotation(slot) + 2, tilt: [Math.PI / 2, 0] as [number, number] },
]);
