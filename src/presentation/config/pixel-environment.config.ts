/**
 * Pixel Arcade surroundings: an 8-bit arcade hall. Cabinet rows line the back
 * and side walls, a prize counter sits back-right, voxel mushrooms, bonus
 * blocks and spinning coins add the platformer flavour. Table at the origin,
 * local player at +z; floor props stay outside radius ~9 so nothing crowds
 * the table. Rim decor uses the safe TABLE_RIM_DECOR slots.
 */
import { ENVIRONMENT_ROOM, getRimFacingRotation, getRimPosition, type Vec3 } from './themed-environment.config';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const { HALF_WIDTH, HALF_DEPTH } = ENVIRONMENT_ROOM;

/** Scene fog distances (the table and cards sit well inside NEAR) */
export const PIXEL_FOG = { NEAR: 14, FAR: 42 } as const;

export const PIXEL_COLORS = {
  fog: '#0a1238',
  ceiling: '#070c2a',
  wallBase: '#0e1748',
  wallStar: '#fff3a8',
  wallStarDim: '#6fd3ff',
  floorA: '#1d2766',
  floorB: '#0c1236',
  stripeA: '#ff4fd8',
  stripeB: '#22e5ff',
  cabinetTrim: '#14141c',
  screenBezel: '#05060c',
  coinSlot: '#ff9f1c',
  counterBody: '#2a3a9a',
  counterTop: '#ffd93b',
  glass: '#9fe8ff',
  shelf: '#3a2a6a',
  signBackground: '#05081c',
  signText: '#ffd93b',
  signBulb: '#ff4fd8',
  screenGlow: '#6fd3ff',
  joystickBase: '#14141c',
  joystickStick: '#d8d8e8',
  joystickBall: '#ff3b55',
  hemisphereSky: '#6fd3ff',
  hemisphereGround: '#1a5e2a',
} as const;

/** Side-art colours, cycled over the cabinets */
export const PIXEL_CABINET_COLORS = ['#d8243a', '#2a4bd8', '#1f9e46', '#7a2bd8', '#e87a14', '#0e8a9a'] as const;
/** Button colours on each control panel (left to right) */
export const PIXEL_BUTTON_COLORS = ['#ff3b55', '#ffd93b', '#4ade5a'] as const;
/** Prize box colours */
export const PIXEL_PRIZE_COLORS = ['#ff4d6d', '#ffd93b', '#4ade5a', '#6fd3ff', '#c77dff', '#ff9f1c'] as const;

/** Voxel model palettes (one char per colour role, see voxel-models.ts) */
export const PIXEL_VOXEL_COLORS = {
  capRed: '#e8304a',
  capShade: '#b01c34',
  spot: '#f4f7ff',
  stem: '#f2dcb0',
  stemShade: '#d4b88a',
  coin: '#ffd93b',
  coinShade: '#d89a14',
  coinShine: '#fff3a8',
  block: '#ffb02e',
  blockShade: '#c87a14',
  blockMark: '#fff3a8',
  brick: '#b8541c',
  mortar: '#5a2408',
  heart: '#ff3b55',
  heartShine: '#ffd0d8',
} as const;

export const PIXEL_LIGHTS = {
  /** Warm marquee yellow above the table */
  key: { position: [0, 7, 2] as Vec3, color: '#ffe66b', intensity: 0.85, distance: 26 },
  /** Magenta screen spill in front of the back cabinet row */
  accent: { position: [0, 3.4, -10.5] as Vec3, color: '#ff4fd8', intensity: 1.3, distance: 15 },
  /** Cyan screen spill along the left cabinet row (third and last point light) */
  spill: { position: [-12.2, 3.1, -4.5] as Vec3, color: '#3ae0ff', intensity: 0.9, distance: 11 },
  hemisphereIntensity: 0.4,
  /** Gentle pulse of the accent light and screen glows */
  pulseAmplitude: 0.08,
} as const;

/** Local cabinet dimensions (origin at floor centre, facing +z) */
export const PIXEL_CABINET = {
  WIDTH: 1.6,
  DEPTH: 1.3,
  HEIGHT: 4.3,
  SCREEN_SIZE: [1.22, 0.96] as [number, number],
  SCREEN_CENTER: [0, 2.98, 0.3] as Vec3,
  SCREEN_TILT: -0.14,
  MARQUEE_SIZE: [1.5, 0.42] as [number, number],
  MARQUEE_CENTER: [0, 4.05, 0.56] as Vec3,
  /** Distance from the wall to the cabinet centre */
  WALL_GAP: 0.72,
} as const;

/** Animated screen atlas: one low-res tile per mini game */
export const PIXEL_SCREENS = {
  TILE_WIDTH: 32,
  TILE_HEIGHT: 24,
  /** Number of different mini games on the atlas */
  VARIANTS: 4,
  /** Repaints per second (chunky retro frame rate, cheap on mobile) */
  FPS: 8,
} as const;

export interface CabinetPlacement {
  position: Vec3;
  rotationY: number;
  /** Which mini game the screen shows */
  variant: number;
  color: string;
}

const BACK_Z = -HALF_DEPTH + PIXEL_CABINET.WALL_GAP;
const LEFT_X = -HALF_WIDTH + PIXEL_CABINET.WALL_GAP;
const RIGHT_X = HALF_WIDTH - PIXEL_CABINET.WALL_GAP;
const BACK_ROW_X = [-9, -6, -3, 0, 3, 6, 9] as const;
const LEFT_ROW_Z = [-9.5, -6.5, -3.5, -0.5] as const;
const RIGHT_ROW_Z = [-2.5, 0.5, 3.5] as const;

function cabinet(position: Vec3, rotationY: number, index: number): CabinetPlacement {
  return {
    position,
    rotationY,
    variant: index % PIXEL_SCREENS.VARIANTS,
    color: PIXEL_CABINET_COLORS[index % PIXEL_CABINET_COLORS.length],
  };
}

/** Back wall row first (those screens also get glow halos), then the side rows */
export const PIXEL_CABINETS: readonly CabinetPlacement[] = [
  ...BACK_ROW_X.map((x) => [x, FLOOR, BACK_Z] as Vec3).map((p, i) => cabinet(p, 0, i)),
  ...LEFT_ROW_Z.map((z) => [LEFT_X, FLOOR, z] as Vec3).map((p, i) => cabinet(p, Math.PI / 2, i + 1)),
  ...RIGHT_ROW_Z.map((z) => [RIGHT_X, FLOOR, z] as Vec3).map((p, i) => cabinet(p, -Math.PI / 2, i + 2)),
];
export const PIXEL_BACK_ROW_COUNT = BACK_ROW_X.length;

/** Prize counter along the right wall, back corner */
export const PIXEL_PRIZE_COUNTER = {
  CENTER: [12.4, FLOOR, -9.6] as Vec3,
  /** Counter footprint: depth along x, length along z */
  DEPTH: 1.2,
  LENGTH: 5.6,
  HEIGHT: 1.5,
  GLASS_HEIGHT: 0.55,
  /** Prize shelves on the wall behind the counter */
  SHELF_X: HALF_WIDTH - 0.35,
  SHELF_DEPTH: 0.6,
  SHELF_HEIGHTS: [1.5, 2.6, 3.7] as const,
  PRIZES_PER_SHELF: 7,
  SIGN_CENTER: [HALF_WIDTH - 0.06, FLOOR + 5.1, -9.6] as Vec3,
  SIGN_SIZE: [4.2, 1.05] as [number, number],
  /** Coins spinning above the counter */
  COIN_COUNT: 5,
  COIN_HEIGHT: 2.6,
  COIN_SCALE: 0.06,
  COIN_SPIN_SPEED: 1.6,
  COIN_BOB: 0.12,
} as const;

/** Voxel props on the floor and floating above the cabinet row */
export const PIXEL_DECOR = {
  /** Voxel edge length for the big floor props */
  MUSHROOMS: [
    { position: [-13.1, FLOOR, -12.7] as Vec3, scale: 0.26, rotationY: 0.5 },
    { position: [-11.3, FLOOR, -13.5] as Vec3, scale: 0.16, rotationY: -0.3 },
    { position: [-14.2, FLOOR, -10.9] as Vec3, scale: 0.12, rotationY: 1.2 },
  ],
  BLOCK_STACK: [
    { position: [11.0, FLOOR, -13.7] as Vec3, scale: 0.28, rotationY: 0.15, kind: 'brick' },
    { position: [11.0, FLOOR + 1.68, -13.7] as Vec3, scale: 0.28, rotationY: 0.15, kind: 'bonus' },
  ] as const,
  /** Platformer row floating over the back cabinets: [x, kind] */
  FLOATING_BLOCKS: [
    [-6, 'brick'],
    [-4.3, 'bonus'],
    [-2.6, 'brick'],
    [2.6, 'brick'],
    [4.3, 'bonus'],
    [6, 'brick'],
  ] as const,
  FLOATING_Y: FLOOR + 6.6,
  FLOATING_Z: -HALF_DEPTH + 0.9,
  FLOATING_SCALE: 0.26,
  /** Big voxel heart on the left wall above the cabinets */
  HEART: { position: [-HALF_WIDTH + 0.3, FLOOR + 6.4, -5] as Vec3, scale: 0.22, rotationY: Math.PI / 2 },
  /** Neon stripes along the walls at these heights above the floor */
  STRIPE_HEIGHTS: [4.9, 5.15] as const,
  STRIPE_THICKNESS: 0.07,
} as const;

/** Wallpaper/floor texture tiling */
export const PIXEL_TEXTURES = {
  WALLPAPER_SIZE: 64,
  WALLPAPER_REPEAT: [10, 3] as [number, number],
  WALLPAPER_STARS: 26,
  FLOOR_REPEAT: [HALF_WIDTH, HALF_DEPTH] as [number, number],
  MARQUEE_SIZE: [48, 14] as [number, number],
  SIGN_SIZE: [64, 16] as [number, number],
} as const;

/** Table rim decor: coin stack, mini mushroom, joystick and bonus block in the four safe slots */
export const PIXEL_RIM_DECOR = {
  COIN_STACK: { angle: 30, voxel: 0.022, count: 3, step: 0.024 },
  MUSHROOM: { position: getRimPosition(330, 0.02), rotationY: getRimFacingRotation(330), voxel: 0.022 },
  JOYSTICK: { position: getRimPosition(162, 0), rotationY: getRimFacingRotation(162), scale: 1 },
  BLOCK: { position: getRimPosition(198, 0), rotationY: getRimFacingRotation(198) + 0.3, voxel: 0.03 },
} as const;

export const PIXEL_RIM_COIN_POSITIONS: readonly Vec3[] = Array.from({ length: PIXEL_RIM_DECOR.COIN_STACK.count }, (_, i) =>
  getRimPosition(PIXEL_RIM_DECOR.COIN_STACK.angle + (i === 2 ? 2.2 : 0), i === 2 ? 0.08 : 0, i === 2 ? 0 : i * PIXEL_RIM_DECOR.COIN_STACK.step),
);

/**
 * Realism pass: a parallax pixel starfield behind wall "space windows", CRT
 * scanlines and bloom on the cabinet screens, dust motes drifting in the
 * screen light and soft reflections of every screen on the glossy floor.
 */
export const PIXEL_REALISM = {
  /** Dust motes in front of each cabinet row (base counts, scaled per device tier) */
  DUST: [
    { id: 'back', count: 120, volume: { center: [0, FLOOR, -12.3] as Vec3, halfSize: [11, 2.3] as const, bottom: FLOOR + 0.6, top: FLOOR + 5.4 } },
    { id: 'left', count: 70, volume: { center: [-13.3, FLOOR, -5] as Vec3, halfSize: [2.2, 6.2] as const, bottom: FLOOR + 0.6, top: FLOOR + 5.4 } },
    { id: 'right', count: 50, volume: { center: [13.3, FLOOR, 0.5] as Vec3, halfSize: [2.2, 4.4] as const, bottom: FLOOR + 0.6, top: FLOOR + 5.4 } },
  ],
  DUST_COLORS: ['#c4f1ff', '#ffc8f3', '#fff3b0', '#ffffff'] as const,
  DUST_SIZE: 1.15,
  DUST_OPACITY: 0.8,
  /** Space windows high on the walls: centre, rotation, size (width, height) */
  STAR_WINDOWS: [
    { id: 'back', position: [0, FLOOR + 7.4, -HALF_DEPTH + 0.02] as Vec3, rotationY: 0, size: [26, 3.7] as [number, number], moon: true },
    { id: 'left', position: [-HALF_WIDTH + 0.02, FLOOR + 7.6, -2] as Vec3, rotationY: Math.PI / 2, size: [20, 3.4] as [number, number], moon: false },
    { id: 'right', position: [HALF_WIDTH - 0.02, FLOOR + 7.6, 3] as Vec3, rotationY: -Math.PI / 2, size: [16, 3.4] as [number, number], moon: false },
  ],
  STARFIELD: {
    /** Star "pixels" per world unit on the nearest layer */
    PIXELS_PER_UNIT: 7,
    /** Depth of each parallax layer behind the wall */
    DEPTHS: [2.5, 7, 18] as const,
    /** Share of cells holding a star, per layer */
    DENSITIES: [0.012, 0.022, 0.035] as const,
    LAYERS: { low: 2, medium: 3, high: 3 },
    /** Brightness levels of the stepped 8-bit twinkle */
    TWINKLE_STEPS: 4,
    SKY_TOP: '#02030f',
    SKY_BOTTOM: '#1a0f4a',
    NEBULA: '#6a1f7a',
    STAR_WARM: '#fff3a8',
    STAR_COOL: '#9fdcff',
    /** Pixel moon in the back window: x, y (window units), radius (world) */
    MOON: [0.3, 0.15, 0.75] as const,
    MOON_COLOR: '#ffe9b0',
    FRAME_THICKNESS: 0.16,
    FRAME_DEPTH: 0.12,
    FRAME_COLOR: '#151a3a',
  },
  SCREEN: {
    /** Screen colour multiplier (above 1 so screens bloom) */
    BRIGHTNESS: 1.7,
    MARQUEE_BRIGHTNESS: 1.35,
    SCANLINE_STRENGTH: 0.38,
    /** Rolling refresh band speed (screen heights per second) and strength */
    ROLL_SPEED: 0.11,
    ROLL_STRENGTH: 0.14,
    VIGNETTE: 1.3,
  },
  /** Stretched screen reflections on the floor in front of each cabinet */
  REFLECTION: { LENGTH: 2.5, WIDTH: 1.25, GAP: 0.05, OPACITY: 0.3, LIFT: 0.006 },
  FLOOR: { ROUGHNESS: 0.3, METALNESS: 0.08, DETAIL_SCALE: 10, NORMAL_STRENGTH: 0.1 },
} as const;
