/**
 * Spring surroundings: a blossom garden pavilion at golden dusk. White
 * columns and a pergola, cherry trees, flower beds and pots, a fountain,
 * butterflies, paper lanterns and drifting petals. Table at the origin,
 * local player at +z; floor props stay outside radius ~5.5.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

export const SPRING_COLORS = {
  fog: '#2c2836',
  background: '#241f2e',
  stone: '#b8ad9e',
  mortar: '#6a6258',
  column: '#efe8dc',
  pergola: '#e4dccd',
  hedge: '#2f5a34',
  hedgeLight: '#3e7244',
  bark: '#4a3328',
  soil: '#3a2a1e',
  planter: '#8a7a68',
  terracotta: '#c0623a',
  terracottaRim: '#a44e2c',
  leaf: '#4e8a46',
  water: '#7ac8e8',
  waterFoam: '#e6f6ff',
  lanternString: '#3a3028',
  lanternCap: '#2a2420',
  lanternGlow: '#ffc88a',
  petalEmissive: '#3a1a2a',
  hemisphereSky: '#f4d8e4',
  hemisphereGround: '#1c2418',
} as const;

/** Sky backdrop painted onto the walls (top -> horizon) and garden silhouettes. */
export const SPRING_SKY = {
  stops: [
    [0, '#3a2c58'],
    [0.45, '#8a5a8a'],
    [0.72, '#f0a88a'],
    [0.84, '#ffd8a0'],
    [1, '#ffd8a0'],
  ] as ReadonlyArray<readonly [number, string]>,
  treeline: '#3a3a48',
  hedgeline: '#2a3a30',
  sun: '#fff0c8',
} as const;

export const SPRING_BLOSSOM_COLORS = ['#ffc4d8', '#ffb0cc', '#ff9ec0', '#ffd6e4', '#f6a8c8'] as const;
export const SPRING_PETAL_COLORS = ['#ffd0e0', '#ffb8d0', '#ffe4ee', '#f8a8c8'] as const;
export const SPRING_FLOWER_COLORS = ['#ff6a8a', '#ffd24a', '#b67aff', '#ffffff', '#ff9a4a', '#6ab0ff'] as const;
export const SPRING_LANTERN_COLORS = ['#ffb0c8', '#ffe08a', '#c8b0ff', '#a8e8c8', '#ffc8a0'] as const;
export const SPRING_BUTTERFLY_COLORS = ['#ffb84a', '#8ac8ff', '#ffe066', '#f08ad0', '#ffffff'] as const;

export const SPRING_LIGHTS = {
  /** Low golden sun from behind the back hedges */
  sun: { position: [0, 6, -11] as Vec3, color: '#ffd2a8', intensity: 1.05, distance: 26 },
  /** Soft lavender bounce from the camera side */
  fill: { position: [0, 3.5, 8] as Vec3, color: '#d8c8ff', intensity: 0.45, distance: 18 },
  hemisphereIntensity: 0.4,
} as const;

/** Columns ring the pavilion: [x, z]. Lantern strings run between consecutive pairs. */
const COLUMN_RING: ReadonlyArray<[number, number]> = [
  [-11, 8],
  [-11.5, 0],
  [-11, -8],
  [-5.5, -12.5],
  [5.5, -12.5],
  [11, -8],
  [11.5, 0],
  [11, 8],
];

export const SPRING_LAYOUT = {
  COLUMNS: COLUMN_RING,
  COLUMN_HEIGHT: 7.2,
  COLUMN_RADIUS: 0.32,
  PERGOLA_Y: FLOOR + 7.4,
  PERGOLA_BEAMS: 9,
  /** Low hedges along the walls: [x, z, length, rotationY] */
  HEDGES: [
    [0, -14.3, 30, 0],
    [-15.3, 0, 28, Math.PI / 2],
    [15.3, 0, 28, Math.PI / 2],
  ] as ReadonlyArray<[number, number, number, number]>,
  HEDGE_HEIGHT: 1.3,
  /** Cherry trees: [x, z, scale, rotationY] */
  TREES: [
    [-8.6, -10.6, 1.15, 0.3],
    [8.8, -10.4, 1.05, 1.8],
    [-13.2, -4.4, 0.95, 2.6],
    [13.0, -3.6, 1.0, 4.1],
    [-12.8, 5.4, 0.85, 0.9],
    [12.6, 5.8, 0.9, 5.2],
  ] as ReadonlyArray<[number, number, number, number]>,
  BLOSSOM_CLUMPS_PER_TREE: 9,
  FOUNTAIN_POSITION: [0, FLOOR, -9.6] as Vec3,
  /** Raised flower beds: [x, z, width, depth, rotationY] */
  BEDS: [
    [-5.4, -8.8, 3.2, 1.1, 0.25],
    [5.4, -8.8, 3.2, 1.1, -0.25],
    [-8.2, 2.2, 1.1, 3.4, 0],
    [8.2, 2.2, 1.1, 3.4, 0],
  ] as ReadonlyArray<[number, number, number, number, number]>,
  FLOWERS_PER_BED: 22,
  /** Floor pots: [x, z, scale] */
  POTS: [
    [-6.8, -6.2, 1.2],
    [6.8, -6.2, 1.1],
    [-2.6, -11.6, 0.9],
    [2.6, -11.6, 0.9],
    [-9.6, 7.0, 1.0],
    [9.6, 7.0, 1.0],
  ] as ReadonlyArray<[number, number, number]>,
  LANTERNS_PER_SPAN: 4,
  LANTERN_SAG: 0.9,
  LANTERN_HANG_Y: FLOOR + 6.6,
  BUTTERFLY_COUNT: 7,
  /** Butterflies wander around these garden spots: [x, y, z] */
  BUTTERFLY_HOMES: [
    [-5.4, FLOOR + 1.2, -8.8],
    [5.4, FLOOR + 1.4, -8.8],
    [-8.2, FLOOR + 1.1, 2.2],
    [8.2, FLOOR + 1.3, 2.2],
    [0, FLOOR + 2.2, -9.6],
    [-8.6, FLOOR + 3.2, -10.2],
    [8.8, FLOOR + 3.0, -10.0],
  ] as ReadonlyArray<Vec3>,
  BUTTERFLY_ROAM: 1.3,
} as const;

/**
 * Realism pass: GPU petals, morning sun shafts through the pergola, low
 * garden mist, fountain water + spray and grass tufts. Everything stays
 * outside the table (shaft footprints sit beyond radius ~6).
 */
export const SPRING_REALISM = {
  PETALS: {
    volume: { center: [0, FLOOR, -2] as Vec3, halfSize: [13.5, 11.5] as const, bottom: FLOOR, top: FLOOR + 8.5 },
    count: 150,
    wind: [0.22, 0, 0.08] as const,
    gust: 0.55,
  },
  /** Slanting morning light between the pergola slats: source high at the back, footprint on the garden floor */
  SHAFTS: [
    { source: [-9, FLOOR + 9.5, -14] as Vec3, target: [-6.5, FLOOR, -7.5] as Vec3, radiusStart: 0.5, radiusEnd: 1.3 },
    { source: [-2.5, FLOOR + 9.8, -14.5] as Vec3, target: [-1, FLOOR, -8] as Vec3, radiusStart: 0.6, radiusEnd: 1.6 },
    { source: [4.5, FLOOR + 9.5, -14] as Vec3, target: [5, FLOOR, -7.4] as Vec3, radiusStart: 0.45, radiusEnd: 1.2 },
    { source: [11, FLOOR + 9.2, -13] as Vec3, target: [9.8, FLOOR, -5.5] as Vec3, radiusStart: 0.5, radiusEnd: 1.35 },
    { source: [-15, FLOOR + 9, 1] as Vec3, target: [-10, FLOOR, 3.5] as Vec3, radiusStart: 0.45, radiusEnd: 1.2 },
  ],
  SHAFT_COLOR: '#ffe0b4',
  SHAFT_INTENSITY: 0.15,
  SHAFT_DUST: { center: [0, FLOOR, -9] as Vec3, halfSize: [11, 3.5] as const, bottom: FLOOR + 0.3, top: FLOOR + 6.5 },
  SHAFT_DUST_COUNT: 90,
  MIST: { center: [0, FLOOR, -1.5] as Vec3, size: [31, 28] as const, height: 0.38, color: '#f2dde6', opacity: 0.2, speed: 0.8 },
  WATER: { deep: '#2f6f86', shallow: '#7cc6dc', sky: '#ffd9c0', highlight: '#fff2d6', opacity: 0.78 },
  CAUSTICS: { color: '#e8fbff', intensity: 0.5 },
  /** Fountain droplets: base count on a high-tier device (scaled down per tier) */
  SPRAY_COUNT: 110,
  SPRAY_COLOR: '#eaf8ff',
  GRASS: { tints: ['#6aa84f', '#4e8a3e', '#7fb85a', '#5a9444'] as const, tuftsPerTree: 12, tuftsPerHedgeUnit: 0.9, tuftsPerBed: 8 },
  WILDFLOWER_COLORS: ['#ffffff', '#fff3a0', '#ffd6e8'] as const,
  /** Vertex sway of blossom clumps and grass (world units at the tip) */
  SWAY: { blossom: { amplitude: 0.035, frequency: 0.9, reach: 1 }, grass: { amplitude: 0.12, frequency: 1.6, reach: 1 } },
} as const;

/** Rim decor: tiny flower pots at three slots, a few fallen petals at the fourth. */
const RIM_POT_SLOTS = [30, 162, 330] as const;
export const SPRING_RIM_POT_SCALE = 0.26;
export const SPRING_RIM_POTS = RIM_POT_SLOTS.map((slot, i) => ({
  position: getRimPosition(slot),
  rotationY: getRimFacingRotation(slot) + i,
}));
export const SPRING_RIM_PETALS = [-4, -1.5, 1, 3.5].map((offset, i) => ({
  position: getRimPosition(198 + offset, (i % 2 === 0 ? 1 : -1) * 0.07, 0.006),
  rotationY: i * 1.7,
  color: SPRING_PETAL_COLORS[i % SPRING_PETAL_COLORS.length],
}));
