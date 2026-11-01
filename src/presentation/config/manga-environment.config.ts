/**
 * Shonen Ink surroundings: a dojo drawn in ink. Shoji paper walls with a
 * wooden lattice, tatami floor, hanging paper lanterns, a tokonoma alcove
 * with a cherry branch in a vase, ink scroll panels, a katana rack, low
 * tables with cushions and an ink-wash mountain view through the open back
 * wall. Table at the origin, local player at +z; floor props stay outside
 * radius ~5.5 and rim decor sits in the safe TABLE_RIM_DECOR slots.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, TABLE_RIM_DECOR, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const { HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;

export const MANGA_COLORS = {
  fog: '#d9d3c5',
  ink: '#121212',
  inkSoft: '#3a3a3c',
  red: '#d8262f',
  redDeep: '#9e1a22',
  paper: '#f4efe2',
  plaster: '#e2dbcb',
  wood: '#5a3e29',
  woodDark: '#2e2018',
  woodLight: '#7a5a3c',
  tatami: '#c9bf86',
  tatamiShade: '#a89d62',
  tatamiBorder: '#1f2a24',
  ceiling: '#241a14',
  lacquer: '#161414',
  wrap: '#7a1a1e',
  gold: '#c9a24a',
  indigo: '#28324c',
  vase: '#e9e4d8',
  branch: '#3a2a20',
  lanternGlow: '#ffd9a8',
  hemisphereSky: '#fffaf0',
  hemisphereGround: '#3a3228',
} as const;

export const MANGA_BLOSSOM_COLORS = ['#ffc6d6', '#ffb2c8', '#ffe2ea', '#f7a2bc'] as const;
export const MANGA_CUSHION_COLORS = [MANGA_COLORS.red, MANGA_COLORS.indigo] as const;
/** Paper lantern tints (texture supplies the ink ribs and red mark) */
export const MANGA_LANTERN_TINTS = ['#ffffff', '#fff1dc', '#ffe0d0'] as const;

/** Ink-wash mountain view: paper sky, far-to-near ridge greys and a red sun. */
export const MANGA_SKY = {
  top: '#f5f1e8',
  bottom: '#e6dfd0',
  ridges: ['#c9c6c0', '#a5a3a0', '#6e6d6c', '#2c2c2e'] as const,
  sun: '#d8262f',
} as const;

export const MANGA_LIGHTS = {
  /** Warm lantern key above the table */
  key: { position: [0, 6.5, 1.5] as Vec3, color: '#ffe6c4', intensity: 1.0, distance: 26 },
  /** Cool daylight bouncing in through the open back wall */
  fill: { position: [0, 4, -11] as Vec3, color: '#e2e8f2', intensity: 0.5, distance: 20 },
  hemisphereIntensity: 0.4,
} as const;

export const MANGA_ROOM = {
  FLOOR_Y: FLOOR,
  HALF_WIDTH,
  HALF_DEPTH,
  HEIGHT,
  FOG_NEAR: 16,
  FOG_FAR: 46,
  /** Shoji section width painted by one texture repeat */
  SHOJI_SECTION: 4,
  /** Height of the horizontal nageshi beam above the shoji (from the floor) */
  BEAM_HEIGHT: 6.6,
  /** Shoji screens end a little above the floor; a wooden kickboard below */
  KICKBOARD_HEIGHT: 0.7,
  /** Wooden posts along the walls */
  POST_SPACING: 8,
  POST_SIZE: 0.32,
  CEILING_BEAMS: 7,
  /** Tatami repeats across the floor (one repeat = two mats deep) */
  TATAMI_REPEAT: [10, 9] as [number, number],
} as const;

/** Open section of the back wall showing the ink-wash mountains. */
export const MANGA_WINDOW = {
  CENTER_X: 0,
  WIDTH: 12,
  BOTTOM: 0.6,
  HEIGHT: 5.6,
  FRAME: 0.22,
  /** Vertical mullions that split the opening into sliding-door bays */
  MULLIONS: 3,
} as const;

/** Raised alcove in the back right corner holding the vase and one scroll. */
export const MANGA_TOKONOMA = {
  POSITION: [12, FLOOR, -13.7] as Vec3,
  SIZE: [4.2, 0.26, 2.0] as Vec3,
  BLOSSOMS: 46,
  BRANCH_SEED: 17,
} as const;

/** Hanging calligraphy scrolls: position (centre), rotationY, art variant (0..2). */
export const MANGA_SCROLL_SIZE: [number, number] = [1.3, 3.4];
export const MANGA_SCROLLS: ReadonlyArray<{ position: Vec3; rotationY: number; variant: number }> = [
  { position: [-12, FLOOR + 3.6, -HALF_DEPTH + 0.06], rotationY: 0, variant: 1 },
  { position: [12, FLOOR + 3.8, -HALF_DEPTH + 0.06], rotationY: 0, variant: 0 },
  { position: [-HALF_WIDTH + 0.06, FLOOR + 3.6, -10], rotationY: Math.PI / 2, variant: 2 },
  { position: [HALF_WIDTH - 0.06, FLOOR + 3.6, -10], rotationY: -Math.PI / 2, variant: 1 },
  { position: [HALF_WIDTH - 0.06, FLOOR + 3.6, 10], rotationY: -Math.PI / 2, variant: 0 },
];

/** Katana rack against the left wall, facing into the room. */
export const MANGA_KATANA_RACK = {
  POSITION: [-14.6, FLOOR, 1.5] as Vec3,
  ROTATION_Y: Math.PI / 2,
  SCALE: 1.7,
  /** Sword rest heights in rack units */
  TIERS: [0.32, 0.52, 0.72] as const,
} as const;

/** Low tables (zataku): [x, z, rotationY]. Two cushions each. */
export const MANGA_LOW_TABLES: ReadonlyArray<[number, number, number]> = [
  [-8.2, -8.4, 0.2],
  [8.8, -6.4, -0.35],
  [11.2, 4.2, 1.4],
  [-9.8, 6.2, 0.1],
];

/** Paper lanterns: [x, z, hang height above floor]. Kept outside radius ~6. */
export const MANGA_LANTERNS: ReadonlyArray<[number, number, number]> = [
  [-6.2, -6.6, 6.2],
  [0, -8.6, 6.6],
  [6.2, -6.6, 6.2],
  [-9.6, 0, 5.9],
  [9.6, 0, 5.9],
  [-7.2, 6.6, 6.3],
  [7.2, 6.6, 6.3],
];

/** Rim decor: ink stone + brush, two tea cups, a rolled scroll and a paper crane. */
const [INK_SLOT, TEA_SLOT, SCROLL_SLOT, CRANE_SLOT] = TABLE_RIM_DECOR.SAFE_ANGLES_DEG;
export const MANGA_RIM = {
  INK_STONE: { position: getRimPosition(INK_SLOT, 0, 0.012), rotationY: getRimFacingRotation(INK_SLOT) },
  BRUSH: { position: getRimPosition(INK_SLOT + 4, 0.05, 0.018), rotationY: getRimFacingRotation(INK_SLOT) + 0.4 },
  TEA_CUPS: [-3, 3].map((offset, i) => ({
    position: getRimPosition(TEA_SLOT + offset, i === 0 ? -0.04 : 0.05),
    rotationY: i * 1.3,
  })),
  SCROLL: { position: getRimPosition(SCROLL_SLOT, 0, 0.03), rotationY: getRimFacingRotation(SCROLL_SLOT) },
  CRANE: { position: getRimPosition(CRANE_SLOT), rotationY: getRimFacingRotation(CRANE_SLOT) + 0.6 },
} as const;

// =============================================================================
// REALISM PASS (daylight shafts, petals, lantern bloom, incense, materials)
// =============================================================================
const WINDOW_TOP = FLOOR + MANGA_WINDOW.BOTTOM + MANGA_WINDOW.HEIGHT;
const SHAFT_SOURCE_Z = -HALF_DEPTH + 0.3;
const SHAFT_TARGET_Z = -HALF_DEPTH + 7.2;

/** Soft daylight through the open back wall: shafts slant into the room and land well short of the table. */
export const MANGA_DAYLIGHT = {
  COLOR: '#fff2da',
  INTENSITY: 0.14,
  SHAFTS: [-4.4, -1.5, 1.5, 4.4].map((x) => ({
    source: [x, WINDOW_TOP - 0.9, SHAFT_SOURCE_Z] as Vec3,
    target: [x + 1.4, FLOOR, SHAFT_TARGET_Z] as Vec3,
    radiusStart: 0.95,
    radiusEnd: 1.6,
  })),
  DUST_COUNT: 90,
  DUST_VOLUME: { center: [0.8, FLOOR, -11.2] as Vec3, halfSize: [6.2, 3.6] as [number, number], bottom: FLOOR + 0.2, top: FLOOR + 5.6 },
  /** Emissive strength of the backlit shoji paper (panes only, the lattice stays dark) */
  SHOJI_GLOW: 0.62,
  SHOJI_GLOW_COLOR: '#fff4e2',
} as const;

/** Sakura petals blowing in through the open side (RealisticParticleField 'petals'). */
export const MANGA_SAKURA = {
  COUNT: 90,
  VOLUME: { center: [0, FLOOR, -11.4] as Vec3, halfSize: [8, 3.6] as [number, number], bottom: FLOOR + 0.05, top: FLOOR + 6.4 },
  /** Breeze from the garden into the room (+z) */
  WIND: [0.1, 0, 0.2] as [number, number, number],
} as const;

/** Paper lanterns: colour multiplier above 1 so bloom softens them like lit washi. */
export const MANGA_LANTERN_LIGHT = {
  BRIGHTNESS: [1.42, 1.3, 1.12] as [number, number, number],
} as const;

/** Incense burner on the tokonoma with two curling smoke wisps. */
export const MANGA_INCENSE = {
  POSITION: [MANGA_TOKONOMA.POSITION[0] - 1.35, FLOOR + MANGA_TOKONOMA.SIZE[1], MANGA_TOKONOMA.POSITION[2] + 0.35] as Vec3,
  SMOKE_SIZE: [0.7, 2.4] as [number, number],
  SMOKE_COLOR: '#dcd8d0',
  SMOKE_OPACITY: 0.42,
  BURNER: '#5a4a32',
  STICK: '#6a3a28',
  EMBER: '#ff7a3a',
} as const;

/** Procedural wood grain on posts and beams (grain runs along each member). */
export const MANGA_WOOD_TEXTURE = {
  /** One plank row per face: v repeat picks a single row of the wood painter */
  REPEAT: [3, 0.17] as [number, number],
  NORMAL_SCALE: 0.45,
} as const;
