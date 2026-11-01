/**
 * Solarpunk surroundings: a bright greenhouse atrium. Glass walls in white
 * frames above a birch knee wall, hanging baskets with trailing vines, potted
 * ferns and monsteras, a water channel with lily pads, sun shafts through the
 * glass roof, butterflies, and wind turbines + solar panels on the meadow
 * outside. Table at the origin, local player at +z; floor props stay outside
 * radius ~5.5 so they never crowd the table.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const TOP = FLOOR + ENVIRONMENT_ROOM.HEIGHT;

export const SOLARPUNK_COLORS = {
  fog: '#d6ebd4',
  tile: '#e8dfc8',
  grout: '#c8b994',
  frame: '#f6f8f2',
  birch: '#e8dcc0',
  glass: '#dff4ea',
  meadow: '#7fb45a',
  moss: '#5a9e46',
  pot: '#f2efe6',
  terracotta: '#c8784a',
  soil: '#4a3424',
  leaf: '#3f8a3c',
  leafLight: '#6cbc4a',
  leafDeep: '#2a6a34',
  stem: '#5a7a34',
  brass: '#d0a84e',
  cable: '#8a7a58',
  lily: '#4e9a3a',
  lotus: '#ffd6e6',
  turbine: '#f4f6f4',
  panel: '#1e3a6a',
  panelFrame: '#d8dcd8',
  sunGlow: '#fff0b8',
  hemisphereSky: '#fff6d8',
  hemisphereGround: '#3c652f',
} as const;

/** Sky dome gradient (zenith -> horizon) and the meadow hills painted on it. */
export const SOLARPUNK_SKY = {
  stops: [
    [0, '#7ec4ef'],
    [0.38, '#b8e2f4'],
    [0.5, '#f4f6dc'],
    [0.52, '#a8d07a'],
    [1, '#6a9e48'],
  ] as ReadonlyArray<readonly [number, string]>,
  hills: ['#9ccc74', '#86bc62', '#72aa52'] as const,
  sun: '#fffbe0',
  radius: 44,
} as const;

export const SOLARPUNK_LIGHTS = {
  /** Midday sun high above the glass roof (behind-left so the shafts read) */
  sun: { position: [-5, 9, -6] as Vec3, color: '#fff0c4', intensity: 1.3, distance: 32 },
  /** Cool green bounce from the planting on the camera side */
  fill: { position: [3, 3.5, 8] as Vec3, color: '#d6f4dc', intensity: 0.5, distance: 20 },
  hemisphereIntensity: 0.6,
} as const;

export const SOLARPUNK_GREENHOUSE = {
  /** Birch knee wall the glass sits on */
  KNEE_HEIGHT: 0.9,
  KNEE_DEPTH: 0.35,
  /** Spacing of the vertical white mullions along every wall */
  MULLION_SPACING: 2.6,
  MULLION_SIZE: 0.12,
  /** Heights (above floor) of the horizontal transoms */
  TRANSOMS: [0.9, 3.4, 6.2, 9.0] as const,
  /** Roof ribs run left to right at this spacing */
  ROOF_RIB_SPACING: 2.5,
  ROOF_RIB_SIZE: 0.16,
  GLASS_OPACITY: 0.14,
  CEILING_Y: TOP,
  FLOOR_TILE_REPEAT: [12, 12] as [number, number],
  /** Moss inlay ring in the floor around the table, with clover tufts */
  MOSS_RING: { inner: 5.5, outer: 6.1, tufts: 28 },
} as const;

/** Outside the glass: meadow, turbines and solar arrays (beyond the walls at |x| 16 / z -15). */
export const SOLARPUNK_OUTSIDE = {
  MEADOW_SIZE: 110,
  /** Wind turbines: [x, z, height, rotationY, spin speed rad/s] */
  TURBINES: [
    [-13, -23, 7.5, 0.2, 1.1],
    [-3, -27, 8.5, -0.1, 0.9],
    [8, -24, 7.8, 0.15, 1.25],
    [19, -21, 7, -0.5, 1.0],
    [-22, -17, 6.5, 0.6, 1.15],
  ] as ReadonlyArray<readonly [number, number, number, number, number]>,
  BLADE_LENGTH: 2.4,
  /** Solar arrays: [centerX, centerZ, rows, cols, rotationY] */
  ARRAYS: [
    [-23, 2, 3, 4, Math.PI / 2],
    [23, -4, 3, 4, -Math.PI / 2],
    [4, -21, 2, 6, 0],
  ] as ReadonlyArray<readonly [number, number, number, number, number]>,
  PANEL_SIZE: [1.7, 1.0] as [number, number],
  PANEL_GAP: 0.25,
  ROW_SPACING: 2.1,
  PANEL_TILT: 0.55,
  PANEL_HEIGHT: 0.7,
} as const;

/** Floor planting: pots of ferns / monsteras around the walls, [x, z, scale]. */
export const SOLARPUNK_PLANTS = {
  FERNS: [
    [-12.8, -12, 1.2],
    [12.6, -11.8, 1.15],
    [-13.4, 3, 1.0],
    [13.4, 4.2, 1.05],
    [-7.2, -7.4, 0.9],
    [7.4, -7.2, 0.95],
    [-11, 9.5, 1.0],
  ] as ReadonlyArray<readonly [number, number, number]>,
  MONSTERAS: [
    [-13.4, -5.6, 1.3],
    [13.2, -2.4, 1.25],
    [-9.6, -11.6, 1.1],
    [9.8, -11.4, 1.15],
    [11.6, 9.6, 1.1],
  ] as ReadonlyArray<readonly [number, number, number]>,
  FROND_COUNT: 11,
  MONSTERA_LEAVES: 7,
  /** Hanging baskets: [x, z, hang height above floor, vine count] */
  BASKETS: [
    [-8, -4, 6.6, 6],
    [8, -3, 6.9, 6],
    [-4.5, -9, 7.2, 5],
    [4.5, -9.5, 6.8, 5],
    [-9.5, 5, 7.0, 5],
    [9.5, 6, 6.7, 5],
    [0, -12, 7.4, 6],
  ] as ReadonlyArray<readonly [number, number, number, number]>,
  VINE_LEAVES: 9,
  VINE_STEP: 0.32,
  /**
   * Climbing vines up some mullions, from the ledge: [wall x (side walls) or
   * z (back wall), position along the wall, height]. Positions match the
   * mullion spacing of SOLARPUNK_GREENHOUSE.
   */
  CLIMBERS: [
    [-16, -9.55, 5.5],
    [-16, 6.82, 4.6],
    [16, -6.82, 5.0],
    [16, 9.55, 4.2],
    [-15, -10.67, 6.2],
    [-15, 5.33, 5.4],
  ] as ReadonlyArray<readonly [number, number, number]>,
  CLIMBER_STEP: 0.26,
} as const;

/** Water channel across the back of the atrium with lily pads and lotus blooms. */
export const SOLARPUNK_WATER = {
  CENTER: [0, FLOOR, -10.6] as Vec3,
  LENGTH: 17,
  WIDTH: 1.3,
  EDGE_WIDTH: 0.22,
  EDGE_HEIGHT: 0.32,
  /** Water surface sits just under the edge top */
  SURFACE_Y: FLOOR + 0.24,
  FLOW_SPEED: 0.35,
  LILY_COUNT: 12,
  LOTUS_COUNT: 4,
} as const;

/**
 * Realism pass: sun shafts through the glass roof (leaning away from the sun
 * at the back-left) with dust and pollen, warm light pools where they land,
 * water caustics, fresnel glass and swaying foliage. Shaft footprints stay
 * beyond radius ~6 so the table is never washed out.
 */
const ROOF = TOP - 0.1;
export const SOLARPUNK_SUN_SHAFTS = {
  SHAFTS: [
    { source: [-7.5, ROOF, -8] as Vec3, target: [-4.6, FLOOR, -6.2] as Vec3, radiusStart: 0.8, radiusEnd: 1.25 },
    { source: [-1.5, ROOF, -10.5] as Vec3, target: [1.6, FLOOR, -8.6] as Vec3, radiusStart: 0.95, radiusEnd: 1.5 },
    { source: [5, ROOF, -8.5] as Vec3, target: [8, FLOOR, -6.6] as Vec3, radiusStart: 0.75, radiusEnd: 1.2 },
    { source: [-11, ROOF, 1] as Vec3, target: [-8, FLOOR, 3] as Vec3, radiusStart: 0.7, radiusEnd: 1.15 },
    { source: [10, ROOF, 0] as Vec3, target: [13, FLOOR, 2] as Vec3, radiusStart: 0.75, radiusEnd: 1.2 },
  ],
  COLOR: '#fff1c4',
  INTENSITY: 0.2,
  /** Bright patches where the shafts enter the glass (glow sprite scale per unit of source radius) */
  ROOF_GLOW_SCALE: 3,
  ROOF_GLOW_OPACITY: 0.6,
  /** Warm pools of light on the floor at each shaft footprint (radius = radiusEnd * factor) */
  POOL_SCALE: 1.35,
  POOL_INTENSITY: 0.22,
  DUST: { center: [-0.5, FLOOR, -5] as Vec3, halfSize: [12, 6] as const, bottom: FLOOR + 0.4, top: FLOOR + 8 },
  DUST_COUNT: 120,
  POLLEN: { center: [0, FLOOR, -3] as Vec3, halfSize: [13, 10] as const, bottom: FLOOR + 0.3, top: FLOOR + 6.5 },
  POLLEN_COUNT: 120,
  POLLEN_WIND: [0.1, 0.012, 0.04] as const,
} as const;

/** Glass: fresnel sheen and faint streaks reflecting the sky. */
export const SOLARPUNK_GLASS = {
  SKY: '#cfeaff',
  HORIZON: '#f4f8e4',
  FRESNEL: 0.55,
  STREAK: 0.05,
  DETAIL_SCALE: 3,
  DETAIL_NORMAL: 0.06,
} as const;

/** Animated water surface, caustics on the channel bed and the floor in front of it. */
export const SOLARPUNK_WATER_LOOK = {
  deep: '#1f6f72',
  shallow: '#78d0c6',
  sky: '#d8f0ff',
  highlight: '#fff8dc',
  opacity: 0.62,
  bed: '#2e6e5c',
  CAUSTICS: { color: '#f2fff4', bedIntensity: 0.55, floorIntensity: 0.28, floorDepth: 1.5 },
} as const;

/** Foliage vertex sway (world units at the leaf tip). */
export const SOLARPUNK_SWAY = {
  foliage: { amplitude: 0.05, frequency: 1.1, reach: 1 },
  bushes: { amplitude: 0.02, frequency: 0.9, reach: 1 },
} as const;

export const SOLARPUNK_BUTTERFLIES = {
  COUNT: 8,
  COLORS: ['#ffd84a', '#ffffff', '#ff9a3a', '#7ac8ff', '#f6a8e0'] as const,
  HOMES: [
    [-12.8, FLOOR + 1.8, -12],
    [12.6, FLOOR + 1.6, -11.8],
    [-7.2, FLOOR + 1.4, -7.4],
    [7.4, FLOOR + 1.5, -7.2],
    [0, FLOOR + 1.2, -10.6],
    [-13.4, FLOOR + 2.4, 3],
    [13.4, FLOOR + 2.2, 4.2],
    [-8, FLOOR + 4.8, -4],
  ] as ReadonlyArray<Vec3>,
  ROAM: 1.4,
} as const;

/** Table rim decor: mini fern pot, mini solar panel, spinning brass turbine, succulent. */
export const SOLARPUNK_RIM = {
  FERN: { position: getRimPosition(30), rotationY: getRimFacingRotation(30), scale: 0.15 },
  PANEL: { position: getRimPosition(162), rotationY: getRimFacingRotation(162), scale: 0.2 },
  TURBINE: { position: getRimPosition(198), rotationY: getRimFacingRotation(198), scale: 0.16 },
  SUCCULENT: { position: getRimPosition(330), rotationY: getRimFacingRotation(330), scale: 0.15 },
  TURBINE_SPIN: 2.2,
} as const;
