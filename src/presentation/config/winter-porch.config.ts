/**
 * Winter lodge: the open archway in the back wall, the covered porch behind
 * it, the snowy yard and the realism layers (snowfall, moon shaft, cold
 * mist, melt puddles). Everything sits behind z = -11, far outside the card
 * play area (radius 2.8) and the table.
 */
import { ENVIRONMENT_ROOM, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const BACK_Z = -ENVIRONMENT_ROOM.HALF_DEPTH;

/** Opening in the back wall (centred on x = 0, from the floor up). */
export const WINTER_ARCHWAY = {
  WIDTH: 7,
  HEIGHT: 5.6,
  /** Timber jambs / lintel framing the opening */
  JAMB_WIDTH: 0.5,
  FRAME_DEPTH: 0.7,
  LINTEL_HEIGHT: 0.55,
} as const;

export const WINTER_PORCH = {
  /** Porch deck: x half width and how far it reaches out (z) */
  HALF_WIDTH: 5.4,
  DEPTH: 3.4,
  DECK_THICKNESS: 0.2,
  ROOF_Y: FLOOR + 6.1,
  ROOF_THICKNESS: 0.24,
  ROOF_OVERHANG: 0.35,
  /** Snow on the roof slab and the rounded cornice at its front edge */
  ROOF_SNOW: 0.32,
  CORNICE_RADIUS: 0.24,
  POST: 0.34,
  /** Railings from each post towards the steps (gap in the middle) */
  RAIL_INNER_X: 2.1,
  RAIL_Y: FLOOR + 0.95,
  BALUSTERS_PER_SIDE: 5,
  ICICLE_COUNT: 22,
} as const;

export const PORCH_FRONT_Z = BACK_Z - WINTER_PORCH.DEPTH;

/** Snowy yard beyond the porch, a few snow-laden pines and the painted forest backdrop. */
export const WINTER_YARD = {
  GROUND_Y: FLOOR - 0.22,
  HALF_WIDTH: 26,
  FAR_Z: BACK_Z - 22,
  SEGMENTS: [48, 28] as const,
  /** Height of the rolling drifts */
  DRIFT_HEIGHT: 0.35,
  /** Pines: [x, z, height, radius] */
  PINES: [
    [-7.4, -22.5, 6.2, 1.9],
    [-11.8, -27, 8, 2.4],
    [6.8, -23.6, 5.6, 1.7],
    [10.6, -28.5, 7.6, 2.3],
    [-3.2, -30.5, 7, 2.1],
    [2.8, -27.6, 6.4, 1.9],
    [15, -25, 7.2, 2.2],
    [-16, -24, 6.8, 2.1],
  ] as ReadonlyArray<readonly [number, number, number, number]>,
  /** Drifts piled against posts and the deck edge: [x, z, radius, height] */
  DRIFTS: [
    [-5.1, PORCH_FRONT_Z + 0.1, 0.9, 0.42],
    [5.2, PORCH_FRONT_Z + 0.05, 1, 0.5],
    [-1.4, PORCH_FRONT_Z - 0.5, 1.4, 0.3],
    [3.4, PORCH_FRONT_Z - 1.1, 1.6, 0.36],
    [-4.2, BACK_Z - 0.35, 0.8, 0.22],
    [4.4, BACK_Z - 0.4, 0.7, 0.2],
    [0.6, BACK_Z + 0.45, 1.1, 0.06],
  ] as ReadonlyArray<readonly [number, number, number, number]>,
  /** Ray-cast forest view far behind the yard (WindowSnowView used as a backdrop) */
  BACKDROP_CENTER: [0, FLOOR + 6.5, BACK_Z - 22.5] as Vec3,
  BACKDROP_SIZE: [56, 16] as const,
} as const;

export const WINTER_YARD_COLORS = {
  porchWood: '#5a3a22',
  porchGrain: '#33200f',
  roofUnderside: '#2c1e14',
  pine: '#18331f',
  /** Night forest backdrop palette (on top of the 'night' window variant) */
  backdrop: {
    skyTop: '#0a1228',
    skyHorizon: '#2b3d63',
    snow: '#a9bcdc',
    mountain: '#41557c',
    treeFar: '#1b2a42',
    treeNear: '#0f1a2b',
    flakes: '#eef3ff',
  },
} as const;

/** Heavy snowfall layers outside: far dense curtain, near big flakes, a flurry blowing in. */
export const WINTER_SNOWFALL = {
  FAR: {
    volume: { center: [0, FLOOR, BACK_Z - 9] as Vec3, halfSize: [11, 4.5] as const, bottom: WINTER_YARD.GROUND_Y, top: FLOOR + 8 },
    count: 760,
    sizeScale: 0.95,
    seed: 3,
  },
  NEAR: {
    volume: { center: [0, FLOOR, PORCH_FRONT_Z - 1.6] as Vec3, halfSize: [7, 1.6] as const, bottom: WINTER_YARD.GROUND_Y, top: FLOOR + 6.4 },
    count: 300,
    sizeScale: 1.35,
    seed: 11,
  },
  /** Light flurry gusting in under the porch roof and through the archway */
  BLOW_IN: {
    volume: { center: [0, FLOOR, BACK_Z + 0.6] as Vec3, halfSize: [3.4, 2.4] as const, bottom: FLOOR, top: FLOOR + 5.2 },
    count: 120,
    sizeScale: 0.9,
    seed: 23,
  },
  WIND: [0.42, 0, 0.12] as const,
  BLOW_IN_WIND: [0.2, 0, 0.42] as const,
  GUST: 0.65,
  FALL_SPEED: 0.62,
} as const;

/** Low cold moonlight pouring under the porch roof and through the archway onto the floor (stays outside r = 5). */
export const WINTER_MOON_SHAFTS = [
  { source: [-2.6, FLOOR + 7.2, BACK_Z - 9] as Vec3, target: [1.2, FLOOR, -8.4] as Vec3, radiusStart: 1.3, radiusEnd: 2.6 },
  { source: [-0.6, FLOOR + 7, BACK_Z - 9.5] as Vec3, target: [3.4, FLOOR, -9.4] as Vec3, radiusStart: 0.7, radiusEnd: 1.5 },
] as const;

export const WINTER_ATMOSPHERE_FX = {
  MOON_SHAFT: { color: '#a9c6ff', intensity: 0.13, dustCount: 70 },
  /** Ice crystals glittering in the shaft */
  SHAFT_DUST: { center: [1.4, FLOOR, BACK_Z + 4] as Vec3, halfSize: [2.6, 3.4] as const, bottom: FLOOR + 0.2, top: FLOOR + 5.2 },
  /** Breath-like cold mist rolling in at the threshold */
  DOOR_MIST: { center: [0, FLOOR, BACK_Z + 1.6] as Vec3, size: [10, 6] as const, height: 0.75, color: '#bccbe4', opacity: 0.26 },
  /** Blowing snow haze over the yard */
  YARD_MIST: { center: [0, WINTER_YARD.GROUND_Y, BACK_Z - 10] as Vec3, size: [30, 14] as const, height: 1.4, color: '#a6b8d6', opacity: 0.4 },
} as const;

/** Wet footprints and meltwater on the planks inside the archway. */
export const WINTER_MELT = {
  CENTER: [0.6, FLOOR + 0.004, BACK_Z + 3.6] as Vec3,
  SIZE: [7, 7] as const,
  TEXTURE_SIZE: 512,
  FOOTPRINT_PAIRS: 6,
  COLOR: '#2a1a10',
  OPACITY: 0.55,
  ROUGHNESS: 0.08,
} as const;
