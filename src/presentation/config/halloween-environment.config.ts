/**
 * Haunted Manor surroundings (Halloween table theme): palette, layout and
 * counts. Positions are world units; the table is centred at the origin with
 * the local player at +z. Floor props stay outside radius ~4.6 so they never
 * clip the table or the seats.
 */
import { ENVIRONMENT_ROOM, getRimPosition, getRimFacingRotation, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

export const HALLOWEEN_COLORS = {
  fog: '#120a1a',
  background: '#07040b',
  stone: '#3a3540',
  stoneDark: '#1f1b25',
  mortar: '#15121a',
  wood: '#2a1d17',
  woodDark: '#1a120e',
  floor: '#1d1820',
  ceiling: '#0d0a10',
  moonGlass: '#9fb4ff',
  moon: '#e8ecff',
  moonGlow: '#7f95ff',
  pumpkin: '#e0640f',
  pumpkinPale: '#e8dcc0',
  pumpkinGreen: '#6f7f3a',
  pumpkinGlow: '#ff7a14',
  faceGlow: '#ffc04d',
  candleWax: '#e9dcc0',
  candleWaxBlack: '#2a2430',
  cauldron: '#1a1a1e',
  potion: '#6dff4a',
  potionGlow: '#3cff2a',
  gravestone: '#545060',
  moss: '#3a4a2a',
  bone: '#d8cfb8',
  bat: '#120c16',
  cobweb: '#c8c4d8',
  hemisphereSky: '#6a5a90',
  hemisphereGround: '#0a0610',
} as const;

export const HALLOWEEN_LIGHTS = {
  moon: { position: [0, 6, -12] as Vec3, color: '#8fa4ff', intensity: 1.1, distance: 24 },
  pumpkins: { position: [-6.5, 1.2, -5] as Vec3, color: '#ff7a1a', intensity: 1.4, distance: 12 },
  /** Positioned inside the cauldron group (see Cauldron.tsx) */
  cauldron: { color: '#4cff3a', intensity: 1.2, distance: 9 },
  hemisphereIntensity: 0.22,
} as const;

export const HALLOWEEN_LAYOUT = {
  /** Gothic arched windows on the back wall (x positions) */
  WINDOW_XS: [-8, 0, 8] as const,
  WINDOW_Y: FLOOR + 3.0,
  WINDOW_WIDTH: 2.6,
  WINDOW_HEIGHT: 4.6,
  /** Side-wall windows (z positions) */
  SIDE_WINDOW_ZS: [-6, 4] as const,
  WAINSCOT_HEIGHT: 1.6,
  BEAM_COUNT: 6,
  /** Wall shelves: [x, y, z, rotationY] */
  SHELVES: [
    [-15.6, FLOOR + 2.4, -11, Math.PI / 2],
    [15.6, FLOOR + 2.4, -1, -Math.PI / 2],
    [-4, FLOOR + 2.6, -14.6, 0],
  ] as ReadonlyArray<[number, number, number, number]>,
  SHELF_WIDTH: 3.2,
  CAULDRON_POSITION: [7.5, FLOOR, -6.5] as Vec3,
  CAULDRON_BUBBLES: 7,
  BAT_COUNT: 7,
  BAT_AREA: { center: [0, FLOOR + 6.5, -4] as Vec3, radius: 9, bob: 0.35 },
} as const;

/** Pumpkins on the floor around the table: [x, z, scale, rotationY, carved]. */
export const HALLOWEEN_FLOOR_PUMPKINS: ReadonlyArray<[number, number, number, number, boolean]> = [
  [-5.2, -3.8, 1.25, 0.6, true],
  [-6.1, -2.6, 0.8, 0.9, false],
  [-4.4, -5.2, 0.7, 0.3, true],
  [5.4, -4.2, 1.1, -0.7, true],
  [6.2, -3.1, 0.65, -1.0, false],
  [-6.6, 2.8, 1.0, 1.4, true],
  [6.8, 3.4, 0.9, -1.5, true],
  [7.4, 2.4, 0.55, -1.2, false],
  [-2.2, -8.6, 1.4, 0.1, true],
  [2.6, -8.9, 0.9, -0.2, true],
  [0.4, -9.6, 0.6, 0, false],
];

/** Gravestones near the back corners: [x, z, scale, rotationY]. */
export const HALLOWEEN_GRAVESTONES: ReadonlyArray<[number, number, number, number]> = [
  [-11.5, -11.5, 1.1, 0.25],
  [-9.6, -12.4, 0.85, 0.1],
  [-13, -9.4, 0.95, 0.6],
  [11.8, -11.2, 1.0, -0.3],
  [10, -12.6, 0.8, -0.1],
];

/** Skulls on the floor and shelves: [x, y, z, scale, rotationY]. */
export const HALLOWEEN_SKULLS: ReadonlyArray<[number, number, number, number, number]> = [
  [-11, FLOOR, -10.4, 0.9, 0.6],
  [12.6, FLOOR, -10.2, 0.8, -0.5],
  [-15.4, FLOOR + 2.46, -11.9, 0.6, Math.PI / 2],
  [15.4, FLOOR + 2.46, -1.8, 0.6, -Math.PI / 2],
  [-3.2, FLOOR + 2.66, -14.4, 0.6, 0.2],
];

/** Floor candle groups: [x, z, height multiplier, scale]. */
export const HALLOWEEN_FLOOR_CANDLES: ReadonlyArray<[number, number, number, number]> = [
  [-4.6, -3.2, 1.6, 1.4],
  [-4.2, -3.6, 1.0, 1.2],
  [4.8, -5.0, 1.8, 1.4],
  [5.2, -5.3, 1.1, 1.1],
  [-10.6, -10.8, 1.4, 1.3],
  [11.2, -10.6, 1.2, 1.3],
  [6.6, -5.6, 1.3, 1.2],
];

/** Cobweb anchors: [x, y, z, rotationY, scale] (corners and window tops). */
export const HALLOWEEN_COBWEBS: ReadonlyArray<[number, number, number, number, number]> = [
  [-15.9, FLOOR + 9.9, -14.9, Math.PI / 4, 2.6],
  [15.9, FLOOR + 9.9, -14.9, -Math.PI / 4, 2.4],
  [-15.9, FLOOR + 9.9, 14.9, (3 * Math.PI) / 4, 2.2],
  [15.9, FLOOR + 9.9, 14.9, (-3 * Math.PI) / 4, 2.2],
  [-15.5, FLOOR + 3.2, -12.5, Math.PI / 2, 0.9],
  [15.5, FLOOR + 3.2, 0.5, -Math.PI / 2, 0.9],
];

/** Rim decor slots (degrees, see TABLE_RIM_DECOR.SAFE_ANGLES_DEG). */
const RIM_PUMPKIN_ANGLES = [162, 198] as const;
const RIM_CANDLE_ANGLES = [30, 330] as const;
export const HALLOWEEN_RIM_PUMPKIN_SCALE = 0.2;
export const HALLOWEEN_RIM_PUMPKINS = RIM_PUMPKIN_ANGLES.map((angle) => ({
  position: getRimPosition(angle),
  rotationY: getRimFacingRotation(angle),
}));
export const HALLOWEEN_RIM_CANDLES = RIM_CANDLE_ANGLES.flatMap((angle) => [
  { position: getRimPosition(angle - 3, -0.04), height: 1.3, scale: 0.75 },
  { position: getRimPosition(angle + 3, 0.05), height: 0.8, scale: 0.7 },
]);

// =============================================================================
// REALISM PASS (ground fog, moon shafts, steam, embers, PBR surfaces)
// =============================================================================
const BACK_WALL_Z = -ENVIRONMENT_ROOM.HALF_DEPTH + 0.2;
const SIDE_WALL_X = ENVIRONMENT_ROOM.HALF_WIDTH - 0.2;
/** Window centre height: arches span WINDOW_Y .. WINDOW_Y + WINDOW_HEIGHT */
const WINDOW_MID_Y = HALLOWEEN_LAYOUT.WINDOW_Y + HALLOWEEN_LAYOUT.WINDOW_HEIGHT * 0.55;

export const HALLOWEEN_REALISM = {
  /** Rolling floor fog; top layer stays below the table surface (y ~ 0) */
  GROUND_FOG: { size: [31, 29] as const, height: 0.42, color: '#5d5878', opacity: 0.42, scale: 2.2, speed: 1.3 },
  /** Moonlight god rays through the gothic windows (every target well outside the play area) */
  MOON_SHAFTS: {
    color: '#a9b8ff',
    intensity: 0.22,
    shafts: [
      ...HALLOWEEN_LAYOUT.WINDOW_XS.map((x) => ({
        source: [x, WINDOW_MID_Y, BACK_WALL_Z] as Vec3,
        target: [x * 0.85, FLOOR, -7.5] as Vec3,
        radiusStart: 1.05,
        radiusEnd: 2.1,
      })),
      ...[-1, 1].map((side) => ({
        source: [side * SIDE_WALL_X, WINDOW_MID_Y, HALLOWEEN_LAYOUT.SIDE_WINDOW_ZS[0]] as Vec3,
        target: [side * 9.6, FLOOR, HALLOWEEN_LAYOUT.SIDE_WINDOW_ZS[0] + 1.2] as Vec3,
        radiusStart: 1.0,
        radiusEnd: 1.9,
      })),
    ],
    dust: { center: [0, FLOOR, -10.5] as Vec3, halfSize: [11.5, 4] as const, bottom: FLOOR + 0.4, top: FLOOR + 6.8 },
    dustCount: 130,
  },
  /** Brew steam rising from the cauldron (local to the cauldron group) */
  STEAM: {
    halfSize: [0.45, 0.45] as const,
    bottom: 1.15,
    top: 3.6,
    count: 70,
    colors: ['#b8ffad', '#e4ffdc', '#8cff7a'] as const,
    fallSpeed: -0.42,
    sizeScale: 5.5,
    opacity: 0.32,
    turbulence: 0.5,
  },
  /** Sparks rising from the fire under the cauldron (local to the cauldron group) */
  EMBERS: { halfSize: [0.55, 0.55] as const, bottom: 0.1, top: 2.6, count: 45, sizeScale: 0.7 },
  /** Procedural PBR surfaces */
  SURFACES: {
    wallRepeat: [8, 3] as const,
    floorRepeat: [8, 8] as const,
    woodRepeat: [6, 1] as const,
    ceilingRepeat: [4, 5] as const,
  },
  /** Translucent cobwebs (painted texture on a quarter fan) */
  COBWEB: { textureSize: 256, spokes: 32, rings: 9, opacity: 0.55 },
  /** Moon disc brightness multiplier (> 1 so the bloom catches it) */
  MOON_BRIGHTNESS: 1.8,
} as const;
