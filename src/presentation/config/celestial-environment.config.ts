/**
 * Celestial Tarot surroundings (Observatory): palette, lights, layout and
 * counts. Positions are world units; the table is centred at the origin with
 * the local player at +z. Floor props stay outside radius ~4.6 so they never
 * clip the table or the seats.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const CEILING = FLOOR + ENVIRONMENT_ROOM.HEIGHT;

export const CELESTIAL_COLORS = {
  fog: '#070a24',
  background: '#03051a',
  stone: '#1c2252',
  stoneDark: '#0f1438',
  mortar: '#080b24',
  floorTile: '#151b44',
  floorMortar: '#0a0d28',
  wood: '#2a1a30',
  woodDark: '#170e1c',
  gold: '#e6c46a',
  goldDeep: '#a07a2c',
  brass: '#c99a48',
  skyTop: '#060a2c',
  skyHorizon: '#1d1852',
  nebula: '#5a3a9a',
  nebulaBlue: '#2a4aa0',
  starWarm: '#fff4d6',
  starCool: '#cdd8ff',
  constellation: '#f2d68a',
  crystal: '#9a7cff',
  crystalCore: '#e2d4ff',
  crystalGlow: '#8a6aff',
  candleWax: '#efe4cc',
  candleFlame: '#ffe0a0',
  candleGlow: '#ffb85a',
  sun: '#ffd27a',
  hemisphereSky: '#6a78d0',
  hemisphereGround: '#1a1208',
} as const;

/** Book spine colours (deep jewel tones with a gilt-ish ochre). */
export const CELESTIAL_BOOK_COLORS = ['#3a1f5a', '#1f2f6a', '#5a1f2a', '#1f4a4a', '#6a4a1f', '#2a2a4a', '#4a1f4a'] as const;

/** Floating planet: position, radius, colour, ring (outer radius multiplier, tilt) or none. */
export interface PlanetSpec {
  position: Vec3;
  radius: number;
  color: string;
  ring?: { color: string; tilt: [number, number] };
  /** Bob phase so planets never move in sync */
  phase: number;
}

export const CELESTIAL_PLANETS: readonly PlanetSpec[] = [
  { position: [-4.6, FLOOR + 6.8, -10.5], radius: 0.95, color: '#d9a46a', ring: { color: '#f2deb0', tilt: [0.45, 0.2] }, phase: 0 },
  { position: [4.2, FLOOR + 7.6, -11.5], radius: 0.6, color: '#6a9ad9', phase: 1.3 },
  { position: [10.4, FLOOR + 5.8, -5], radius: 0.75, color: '#c86a5a', ring: { color: '#e8c0a0', tilt: [-0.35, 0.5] }, phase: 2.4 },
  { position: [-11, FLOOR + 6.2, -3.5], radius: 0.5, color: '#9ad9b0', phase: 3.6 },
  { position: [0.6, FLOOR + 8.4, -7.5], radius: 0.38, color: '#e8e0f4', phase: 4.8 },
];

export const CELESTIAL_PLANET_MOTION = {
  /** Vertical bob amplitude (world units) */
  BOB: 0.18,
  BOB_SPEED: 0.5,
  /** Planet spin around its own axis (radians/s) */
  SPIN: 0.15,
  RING_INNER: 1.35,
  RING_OUTER: 2.15,
} as const;

export const CELESTIAL_LIGHTS = {
  /** Warm gold key over the table */
  key: { position: [0, 7, 2] as Vec3, color: '#ffe2a0', intensity: 1.0, distance: 26 },
  /** Violet glow of the crystal ball (positioned at the ball) */
  crystal: { color: '#9a7cff', intensity: 1.2, distance: 9, pulseSpeed: 1.1, pulseAmount: 0.25 },
  hemisphereIntensity: 0.32,
} as const;

export const CELESTIAL_DOME = {
  /** Base of the dome sits on the wall tops */
  BASE_Y: CEILING,
  RADIUS: 14.6,
  /** Vertical squash of the hemisphere (dome height = RADIUS * Y_SCALE) */
  Y_SCALE: 0.45,
  SEGMENTS: 48,
  RIB_COUNT: 8,
  /** Sky rotation speed (radians/s) */
  ROTATION_SPEED: 0.012,
  /** Constellations sit just inside the dome surface */
  CONSTELLATION_INSET: 0.25,
  STAR_COUNT: 650,
  SKY_TEXTURE: [1024, 512] as [number, number],
  STAR_POINT_SIZE: 0.55,
  TWINKLE_SPEED: 1.6,
} as const;

/** Constellations as [azimuthDeg, elevationDeg] stars plus index pairs for the lines. */
export interface ConstellationSpec {
  stars: ReadonlyArray<[number, number]>;
  lines: ReadonlyArray<[number, number]>;
}

export const CELESTIAL_CONSTELLATIONS: readonly ConstellationSpec[] = [
  // Hunter (belt + shoulders + feet)
  {
    stars: [[250, 38], [262, 40], [256, 50], [244, 52], [268, 30], [242, 28], [254, 30], [258, 30]],
    lines: [[0, 2], [2, 3], [3, 0], [1, 2], [0, 5], [1, 4], [6, 7], [5, 6], [7, 4]],
  },
  // Plough (seven stars)
  {
    stars: [[60, 50], [72, 52], [82, 50], [90, 46], [100, 40], [98, 30], [86, 34]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  // Crown (arc)
  {
    stars: [[150, 30], [158, 36], [168, 38], [178, 36], [186, 30]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  // Swan (cross)
  {
    stars: [[320, 64], [322, 52], [324, 40], [326, 30], [308, 50], [336, 54]],
    lines: [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]],
  },
  // Lyre (small parallelogram + bright head)
  {
    stars: [[20, 34], [26, 28], [32, 30], [30, 22], [24, 20]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]],
  },
  // Scorpion tail near the horizon
  {
    stars: [[200, 16], [208, 20], [216, 18], [222, 12], [218, 6], [210, 5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
];

export const CELESTIAL_LAYOUT = {
  /** Pilasters with gold capitals: back wall x positions, side wall z positions */
  PILLAR_BACK_XS: [-8.5, -2.8, 2.8, 8.5] as const,
  PILLAR_SIDE_ZS: [-10, -2, 6] as const,
  PILLAR_SIZE: [0.7, 0.35] as [number, number],
  CORNICE_HEIGHT: 0.35,
  /** Zodiac floor medallion under the table */
  ZODIAC_RADIUS: 6.4,
  ZODIAC_TEXTURE: 512,
  TELESCOPE: {
    position: [-7.4, FLOOR, -8.6] as Vec3,
    /** Yaw (around Y) and pitch of the tube */
    yaw: -0.6,
    pitch: 0.82,
    tubeLength: 4.4,
    tripodHeight: 2.1,
  },
  ARMILLARY: {
    position: [7.6, FLOOR, -8.2] as Vec3,
    pedestalHeight: 1.25,
    radius: 1.05,
    /** Ecliptic tilt (radians) */
    tilt: 0.41,
    spinSpeed: 0.18,
  },
  CRYSTAL_BALL: {
    position: [8.6, FLOOR, -1.6] as Vec3,
    tableHeight: 1.0,
    ballRadius: 0.34,
  },
  /** Bookcases: [x, z, rotationY] against the walls */
  BOOKCASES: [
    [-12.2, -14.62, 0],
    [12.2, -14.62, 0],
    [-15.62, -6, Math.PI / 2],
    [15.62, -6, -Math.PI / 2],
  ] as ReadonlyArray<[number, number, number]>,
  BOOKCASE: { width: 3, height: 4.2, depth: 0.5, shelves: 4, board: 0.08 },
  BOOKS_PER_SHELF: 9,
} as const;

/** Floor candelabra candles beside the crystal ball table and telescope. */
export const CELESTIAL_FLOOR_CANDLES = [
  { position: [8.2, FLOOR + 1.0, -1.3] as Vec3, scale: 1.1, height: 1.4 },
  { position: [9.0, FLOOR + 1.0, -1.95] as Vec3, scale: 0.9, height: 0.8 },
  { position: [-5.6, FLOOR, -9.6] as Vec3, scale: 2.2, height: 2.6 },
  { position: [-5.2, FLOOR, -9.9] as Vec3, scale: 1.8, height: 1.7 },
  { position: [5.8, FLOOR, -9.8] as Vec3, scale: 2.0, height: 2.2 },
] as const;

// =============================================================================
// TABLE RIM DECOR (visual only, outside the play area)
// =============================================================================
const RIM_CANDLE_SLOTS = [30, 330] as const;
export const CELESTIAL_RIM_CANDLE_SCALE = 0.5;
export const CELESTIAL_RIM_CANDLES = RIM_CANDLE_SLOTS.flatMap((slot) => [
  { position: getRimPosition(slot - 2.2, 0.04), scale: CELESTIAL_RIM_CANDLE_SCALE, height: 1.4 },
  { position: getRimPosition(slot + 2, -0.05), scale: CELESTIAL_RIM_CANDLE_SCALE, height: 0.85 },
]);

/** Tiny crystal ball on a brass stand */
export const CELESTIAL_RIM_CRYSTAL = { position: getRimPosition(162), radius: 0.075 } as const;
/** Tiny upright astrolabe facing the table centre */
export const CELESTIAL_RIM_ASTROLABE = {
  position: getRimPosition(198, 0, 0.11),
  rotationY: getRimFacingRotation(198),
  radius: 0.095,
} as const;
/** Gold star crystals scattered next to the candles */
export const CELESTIAL_RIM_STARS = [
  { position: getRimPosition(26, -0.02, 0.03), rotationY: 0.4 },
  { position: getRimPosition(334, 0.02, 0.03), rotationY: 1.2 },
  { position: getRimPosition(158, 0.06, 0.03), rotationY: 2.1 },
] as const;

// =============================================================================
// REALISM PASS (deep starfield, milky way, shooting stars, beam, dust)
// =============================================================================
export const CELESTIAL_REALISM = {
  /** GPU starfield on the dome (one THREE.Points, twinkle in the vertex shader) */
  STARFIELD: {
    COUNT: { low: 550, medium: 1000, high: 1600 },
    /** Share of stars concentrated in the milky-way band */
    BAND_SHARE: 0.5,
    /** Just inside the dome so stars sit in front of the painted sky */
    INSET: 0.4,
    /** World size range (tiny pinpricks .. bright stars) */
    SIZE: [0.035, 0.2] as [number, number],
    /** Brightness range; the top end exceeds 1 so the bloom picks it up */
    BRIGHTNESS: [0.45, 2.6] as [number, number],
    /** Max point size in CSS px (scaled by dpr) */
    MAX_POINT_SIZE: 14,
    TWINKLE_SPEED: [0.6, 2.4] as [number, number],
    /** Spectral tints: blue-white giants to orange dwarfs, weighted to white */
    COLORS: ['#9fb4ff', '#cad7ff', '#f4f6ff', '#f4f6ff', '#fff4e6', '#ffe0b8', '#ffc78f'] as const,
  },
  /** Milky way great circle: plane tilt from horizontal + azimuth of its tilt axis (radians), angular half-width */
  MILKY_WAY: {
    TILT: 1.05,
    AZIMUTH: 0.7,
    WIDTH: 0.16,
    /** Canvas blobs painted along the band in the sky texture */
    GLOW_BLOBS: 260,
    GLOW_COLORS: ['#b9b4ff', '#ffe6cc', '#9ab8ff'] as const,
    DUST_COLOR: '#03040f',
  },
  /** Occasional meteors streaking across the dome (vertex-shader driven) */
  SHOOTING_STARS: {
    COUNT: 3,
    /** Each streak waits a random period in this range (s) between flights */
    PERIOD: [12, 28] as [number, number],
    DURATION: 1.1,
    /** Tail length as a fraction of the path */
    TAIL: 0.32,
    WIDTH: 0.06,
    COLOR: '#fff2d6',
    BRIGHTNESS: 2.4,
    INSET: 0.7,
  },
  /** Starlight beam falling through the dome opening onto the telescope */
  BEAM: {
    shafts: [{ source: [-3.4, CEILING + 1.6, -6.8] as Vec3, target: [-7.6, FLOOR, -8.9] as Vec3, radiusStart: 0.65, radiusEnd: 1.9 }],
    color: '#b7c6ff',
    intensity: 0.24,
    dust: { center: [-5.8, FLOOR, -8.2] as Vec3, halfSize: [2.4, 2] as const, bottom: FLOOR + 0.3, top: FLOOR + 8 },
    dustCount: 80,
  },
  /** Warm motes floating in the candle light (kept off the table by the clear radius) */
  CANDLE_DUST: {
    volume: { center: [0, FLOOR, -3.5] as Vec3, halfSize: [13, 10] as const, bottom: FLOOR + 0.4, top: FLOOR + 8 },
    count: 190,
    colors: ['#ffe2a8', '#fff4d6', '#e6c46a'] as const,
  },
  /** Twinkling gold stardust sparks */
  STARDUST: {
    volume: { center: [0, FLOOR, -4] as Vec3, halfSize: [12, 9.5] as const, bottom: FLOOR + 1, top: FLOOR + 9 },
    count: 45,
    colors: ['#fff4d6', '#e6c46a', '#cdd8ff'] as const,
    sizeScale: 0.45,
  },
  /** Third point light: warm candle glow by the telescope candelabra */
  CANDLE_LIGHT: { position: [-5.4, FLOOR + 2.4, -9.4] as Vec3, color: '#ffb85a', intensity: 1.1, distance: 9 },
  /** Bloom-friendly emissive boosts */
  CRYSTAL_EMISSIVE: 1.3,
  SUN_BRIGHTNESS: 1.8,
  /** Fine roughness / normal variation on brass and gold */
  METAL_DETAIL: { scale: 5, normalStrength: 0.18 },
} as const;
