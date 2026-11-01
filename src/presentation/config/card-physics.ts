/**
 * Card physics configuration: dimensions, spring physics, and feedback.
 * Part of the physics configuration module system.
 */

// =============================================================================
// TABLE SURFACE
// =============================================================================
export const TABLE_SURFACE = {
  /** Y position of the felt surface (matches FeltSurface.tsx) */
  FELT_Y: 0.02,

  /** Calculated Y position for card center when lying flat on table
   *  = FELT_Y + (CARD_THICKNESS * CARD_SCALE) / 2
   *  With CARD_THICKNESS=0.02 and typical scale=0.9, center height ~= 0.029
   */
  CARD_REST_Y: 0.03,

  /** Small epsilon to prevent z-fighting */
  EPSILON: 0.001,
} as const;

// =============================================================================
// CARD DIMENSIONS
// =============================================================================
export const CARD_DIMENSIONS = {
  WIDTH: 0.7,
  HEIGHT: 1.0,
  THICKNESS: 0.02,
  BASE_SCALE: 0.65,
} as const;

export function getCardRestY(
  scale: number = 1,
  thickness: number = CARD_DIMENSIONS.THICKNESS
): number {
  return TABLE_SURFACE.FELT_Y + (thickness * scale) / 2 + TABLE_SURFACE.EPSILON;
}

// =============================================================================
// SPRING PHYSICS
// =============================================================================
export const SPRING_CONFIG = {
  // Card hover/select springs
  STIFFNESS: 280,        // Higher = snappier response
  DAMPING: 16,           // Higher = less oscillation

  // Drag follow springs (more responsive)
  DRAG_STIFFNESS: 500,
  DRAG_DAMPING: 24,

  // Position interpolation speeds - FASTER for more responsive drag
  LERP_SPEED: {
    SLOW: 0.18,          // Return to hand
    MEDIUM: 0.3,         // General movement
    FAST: 0.75,          // Drag follow
    INSTANT: 0.9,        // Near-immediate feedback
  },

  // Tilt smoothing for drag
  TILT_LERP_SPEED: 0.4,
} as const;

// =============================================================================
// CARD FEEDBACK
// =============================================================================
export const FEEDBACK_CONFIG = {
  // Scale multipliers
  HOVER_SCALE: 1.04,               // Subtle 4% on hover
  SELECT_SCALE: 1.08,              // 8% bigger when selected

  // Wobble (makes cards feel alive)
  WOBBLE_INTENSITY: {
    IDLE: 0,
    HOVER: 0,                      // No wobble on hover for refined feel
    SELECT: 0.025,                 // Subtle wobble when selected
    DRAG: 0.02,                    // Subtle during drag
  },
  WOBBLE_SPEED: {
    X: 5.0,                        // Hz
    Z: 4.2,                        // Hz
  },

  // Tilt based on velocity - MORE RESPONSIVE
  VELOCITY_TILT_FACTOR: 0.18,
  MAX_TILT: 0.65,                  // Allow ~37° tilt

  // Glow/outline
  GLOW_OPACITY_HOVER: 0.6,         // Border outline opacity on hover
  GLOW_OPACITY_SELECT: 0.8,        // Border outline opacity when selected
  GLOW_OPACITY_DRAG: 0.55,         // During drag
  GLOW_LERP_SPEED: 0.3,            // Fast fade for responsive feel

  // Tilt on hover (card tilts back to show face)
  HOVER_TILT_X: -0.12,             // Radians (~7 degrees backward tilt)

  // Glow colors
  GLOW_COLOR_PLAYABLE: '#4488ff',  // Blue for playable
  GLOW_COLOR_SELECTED: '#44ff88',  // Green for selected
  GLOW_COLOR_DISABLED: '#ff4444',  // Red for non-playable
} as const;

// =============================================================================
// CARD STACKING (played cards on table)
// =============================================================================
export const CARD_STACKING = {
  HEIGHT_PER_CARD: 0.015,        // 15mm vertical separation between stacked cards
  CENTER_PULL_FACTOR: 0.15,      // Later cards pulled 15% closer to center
  ROTATION_SPREAD: 0.1,          // Additional rotation variance for natural stacking
  MIN_HORIZONTAL_OFFSET: 0.02,   // Minimum XZ offset to prevent perfect overlap
  BASE_RENDER_ORDER: 100,        // Base render order for played cards
  HAND_RENDER_ORDER: 1000,       // Local hand draws after everything on the table, without depth test
} as const;
