/**
 * Layout configuration for camera, player hands, and opponent displays.
 * Part of the physics configuration module system.
 */

// =============================================================================
// CAMERA & VIEW
// =============================================================================
export const CAMERA_CONFIG = {
  DESKTOP: {
    POSITION: [0, 5.5, 6.5] as [number, number, number],
    FOV: 50,
  },
  MOBILE: {
    POSITION: [0, 6.5, 5.5] as [number, number, number],
    FOV: 58,
  },

  /**
   * Half-width around the target that must stay in view: opponent hands sit at radius 2.47
   * and fan out up to 0.6, so the side seats reach x ≈ ±3.07. Narrow viewports pull the
   * camera back until this fits.
   */
  FIT_HALF_WIDTH: 3.2,

  /** Framing by the actual table (table-fit-points.ts, camera-framing.ts) */
  FRAMING: {
    /** Seat brandmarks sit on the rim at this radius (useBrandmarkPositions) */
    SEAT_RIM_RADIUS: 3.1,
    /** Brandmark plate footprint (PlayerBrandmark): half length along the rim, half depth across it */
    SEAT_PLATE: { HALF_LENGTH: 0.35, HALF_DEPTH: 0.08 },
    /** Margin kept around every plate corner when the camera fits the seats */
    SEAT_PADDING: 0.04,
    /**
     * Portrait screens: share of the height the HUD covers at the top and the hand at the
     * bottom. The table centre is framed in the middle of the band between them.
     */
    PORTRAIT_RESERVE: { TOP: 0.1, BOTTOM: 0.27 },
    /** Side docks (standings) take at most half the canvas width from the stage the table is framed in */
    MIN_STAGE_WIDTH_FRACTION: 0.5,
  },

  /** Room envelope (themed-environment.config.ts getCameraEnvelope) */
  ENVELOPE: {
    /**
     * When the envelope forces a flatter view, the top edge of the view must still point at
     * least this far downward, so nothing above the camera (beams) can enter the picture.
     */
    TOP_RAY_MARGIN_DEG: 2,
  },

  /**
   * A new room (table theme) has its own envelope, so on narrow screens its framing differs by
   * up to ~6 units: the camera glides there (camera-transition.ts) instead of cutting.
   */
  FRAMING_TRANSITION: {
    MIN_MS: 400,
    /** Peak speed of the camera and its target (units/s): 0.13 units per frame at 60 Hz */
    MAX_SPEED: 8,
    /** A frame longer than this (a stall, a background tab) advances the glide by this much only */
    MAX_FRAME_MS: 50,
  },

  // OrbitControls
  TARGET: [0, 0.2, 0] as [number, number, number],
  MIN_DISTANCE: { DESKTOP: 4, MOBILE: 3 },
  MAX_DISTANCE: { DESKTOP: 14, MOBILE: 10 },
  MIN_POLAR_ANGLE: Math.PI / 8,    // ~22.5°
  MAX_POLAR_ANGLE: Math.PI * 0.4,  // ~72°
  ROTATE_SPEED: 0.5,
  ZOOM_SPEED: 0.7,
  DAMPING_FACTOR: 0.08,
} as const;

// =============================================================================
// HAND LAYOUT
// =============================================================================
export const HAND_CONFIG = {
  // Position relative to camera (CameraRelativeHand)
  DISTANCE_FROM_CAMERA: 2.5,       // Units in front
  VERTICAL_OFFSET: {               // Units below center (at camera zoom 1)
    LANDSCAPE: -0.82,
    PORTRAIT: -0.86,               // Narrow screens sit the hand a little lower
  },
  PORTRAIT_MAX_ASPECT: 0.75,       // Width/height below this uses the portrait offset

  /**
   * Hand layout solver (PlayerHand.fit.ts). Cards keep their preferred size and spacing while
   * they fit; then the spacing shrinks to the minimum tappable strip, then the cards shrink,
   * then the hand splits into overlapping rows. Every card always stays on screen.
   */
  LAYOUT: {
    /** Preferred card scale with up to TAPER.FROM cards */
    CARD_SCALE: { PORTRAIT: 0.5, LANDSCAPE: 0.58 },
    /** Preferred card scale from TAPER.TO cards on (continuous in between, no size cliff) */
    DENSE_CARD_SCALE: { PORTRAIT: 0.38, LANDSCAPE: 0.48 },
    TAPER: { FROM: 5, TO: 10 },
    /** Smallest card relative to its preferred scale before another row is added */
    MIN_SCALE_RATIO: 0.6,
    /** Preferred distance between card centres, relative to the card width */
    SPACING_RATIO: { PORTRAIT: 0.8, LANDSCAPE: 0.94 },
    /** Share of the visible width the hand may use (landscape leaves room for side HUD) */
    WIDTH_FRACTION: { PORTRAIT: 0.92, LANDSCAPE: 0.7 },
    /** Minimum visible strip of an overlapped card in CSS px (finger vs mouse) */
    MIN_STRIP_PX: { COARSE: 30, FINE: 18 },
    MAX_ROWS: 3,
    /** A multi-row hand stays within this share of the screen height (a single row uses ~23%) */
    MAX_HEIGHT_FRACTION: 0.24,
    /** Vertical step between rows, relative to card height (the row behind shows its top part) */
    ROW_STEP: 0.46,
    /** Arc lift of the middle cards, relative to card height */
    ARC_HEIGHT: { RELAXED: 0.28, COMPRESSED: 0.38 },
    /** Total fan rotation across a row (radians) */
    FAN_ANGLE: { RELAXED: 0.15, COMPRESSED: 0.25 },
    /** Depth step per card toward the camera: later cards win pointer hits where they overlap */
    Z_STEP: 0.004,
  },

  // Animation: gentle vertical bob of the whole hand on your turn
  BREATHE_AMPLITUDE: 0.008,
  BREATHE_SPEED: 0.002,            // Radians per ms
} as const;

// =============================================================================
// OPPONENT HAND WOBBLE
// =============================================================================
export const OPPONENT_HAND_WOBBLE = {
  AMPLITUDE_Y: 0.005,              // Vertical breathing
  AMPLITUDE_X: 0.002,              // Horizontal sway
  AMPLITUDE_ROT: 0.025,            // Rotation wobble
  SPEED: 0.9,                      // Slower = more relaxed
  PHASE_SPREAD: 0.6,               // Phase offset between cards
  POSITION_INFLUENCE: 0.3,         // Edge cards wobble more
} as const;

// =============================================================================
// OPPONENT HAND LAYOUT
// =============================================================================
export const OPPONENT_HAND_LAYOUT = {
  MAX_SPREAD: 1.2,                 // Total width of fan
  SPREAD_PER_CARD_MAX: 0.18,       // Maximum spacing per card
  STACK_HEIGHT_PER_CARD: 0.012,    // 12mm stacking
  MAX_ARC_ANGLE: 0.5,              // Maximum fan rotation
  ARC_ANGLE_MULTIPLIER: 0.08,      // Angle per card
  CARD_TILT_ANGLE: 0.15,           // Cards tilt toward player
} as const;

// =============================================================================
// OPPONENT HAND MESH (one instanced draw for the backs, one for the edges, per hand)
// =============================================================================
export const OPPONENT_CARD_MESH = {
  WIDTH: 0.5,
  HEIGHT: 0.72,
  THICKNESS: 0.015,
  EDGE_COLOR: '#2a2a3a',
  /** Back colour while no back texture exists (server render, first frame) */
  FALLBACK_BACK_COLOR: '#1a2a48',
  /** Instance slots allocated per hand (largest hand: 60 cards / 3 players); grows if exceeded */
  CAPACITY: 20,
} as const;
