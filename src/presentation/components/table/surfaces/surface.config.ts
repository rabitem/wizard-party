/**
 * Layout constants for the themed table surfaces.
 *
 * The physics collider (rapier.config TABLE_PHYSICS) is never touched: every
 * themed surface keeps the play disc at FELT_Y and only swaps materials or adds
 * non-colliding overlays. Decor that could cover cards sits outside PLAY_RADIUS.
 */

export const SURFACE_LAYOUT = {
  /** Cards land and slide inside this radius - decor stays outside it */
  PLAY_RADIUS: 2.8,
  /** Play disc (same as the classic felt) */
  FELT_RADIUS: 2.88,
  FELT_Y: 0.02,
  /** Darker felt edge band */
  EDGE_INNER: 2.75,
  EDGE_OUTER: 2.89,
  /** Darker centre circle */
  CENTER_RADIUS: 0.48,
  /** Decorative inlay rings (same radii as the classic felt) */
  INNER_RING: [1.85, 1.94] as const,
  OUTER_RING: [2.68, 2.72] as const,
  /** Wood rim ring drawn by WoodRimBase at y = -0.02 */
  RIM_INNER: 2.9,
  RIM_OUTER: 3.35,
  /** Overlay painted just above the wood rim (below rim decor and brandmarks) */
  RIM_OVERLAY_Y: -0.0175,
  /** Cap that hides the brass inner trim + inner wood molding */
  LIP_CAP: { radius: 2.905, y: 0.012, tube: 0.044 },
  /** Cap over the outer wood molding (torus 3.32 / 0.025) */
  OUTER_CAP: { radius: 3.32, y: 0.015, tube: 0.029 },
  /** Cover over the leather armrest (torus 3.5 / 0.18) */
  ARMREST_CAP: { radius: 3.5, y: 0.04, tube: 0.19 },
  /** Circle/ring segment count for smooth rings */
  SEGMENTS: 96,
} as const;

/** Stacking heights of the flat play-disc layers (all non-colliding). */
export const SURFACE_LAYER_Y = {
  BASE: 0.02,
  EDGE: 0.021,
  DECAL: 0.0215,
  CENTER: 0.022,
  INLAY: 0.0235,
  INNER_RING: 0.025,
  OUTER_RING: 0.026,
  EDGE_DECOR: 0.0245,
} as const;

/** Canvas sizes for procedural textures (kept small for mobile). */
export const SURFACE_TEXTURE_SIZE = {
  TILE: 512,
  DECAL: 1024,
  STRIP_WIDTH: 1024,
  STRIP_HEIGHT: 128,
} as const;

/**
 * Rim angles (degrees, TABLE_RIM_DECOR convention: 0 = local player) that stay
 * clear of the brandmarks for 3-6 players and of the themed environments' own
 * rim decor (30 / 160-201 / 330).
 */
export const SURFACE_RIM_SLOTS_DEG = {
  NORTH_EAST: 45,
  EAST: 105,
  WEST: 255,
  NORTH_WEST: 315,
  FRONT_LEFT: 345,
  FRONT_RIGHT: 15,
} as const;

/** Animation speeds (all frozen when the viewer prefers reduced motion). */
export const SURFACE_MOTION = {
  WATER_SPEED: 0.55,
  BOB_SPEED: 1.6,
  BOB_HEIGHT: 0.005,
  PULSE_SPEED: 1.4,
  RUNE_FLICKER_SPEED: 2.3,
} as const;
