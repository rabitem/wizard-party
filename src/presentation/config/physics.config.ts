/**
 * Centralized physics and animation configuration for the card game.
 * All physics constants in one place for easy tuning.
 */

// =============================================================================
// CARD DIMENSIONS
// =============================================================================
export const CARD_DIMENSIONS = {
  WIDTH: 0.7,
  HEIGHT: 1.0,
  THICKNESS: 0.02,
  BASE_SCALE: 0.65,
} as const;

// =============================================================================
// SPRING PHYSICS
// =============================================================================
export const SPRING_CONFIG = {
  // Card hover/select springs
  STIFFNESS: 200,        // Higher = snappier response
  DAMPING: 14,           // Higher = less oscillation

  // Drag follow springs (more responsive)
  DRAG_STIFFNESS: 300,
  DRAG_DAMPING: 20,

  // Position interpolation speeds
  LERP_SPEED: {
    SLOW: 0.12,          // Return to hand
    MEDIUM: 0.2,         // General movement
    FAST: 0.35,          // Drag follow (more responsive)
    INSTANT: 0.5,        // Immediate feedback
  },
} as const;

// =============================================================================
// DRAG & DROP
// =============================================================================
export const DRAG_CONFIG = {
  // Play zone geometry
  PLAY_ZONE_RADIUS: 1.3,           // Core drop zone
  PLAY_ZONE_VISUAL_RADIUS: 1.5,    // Visual indicator (slightly larger)
  PLAY_ZONE_ENTRY_THRESHOLD: 2.2,  // Start feedback at this distance

  // Drag plane
  DRAG_PLANE_Y: 0.4,               // Height cards drag at

  // Scale and elevation
  SCALE_MULTIPLIER: 1.2,           // Card grows 20% when dragging
  HOVER_ELEVATION: 0.08,           // Lift on hover
  SELECT_ELEVATION: 0.15,          // Lift when selected
  DRAG_ELEVATION_BASE: 0.35,       // Base lift when dragging
  DRAG_ELEVATION_PROXIMITY: 0.25,  // Additional lift near play zone

  // Flick detection
  FLICK_VELOCITY_THRESHOLD: 6,     // Lower = easier to flick
  FLICK_DIRECTION_THRESHOLD: 0.4,  // Dot product (0.4 = ~66° cone)
  VELOCITY_SAMPLE_COUNT: 6,        // Frames to average

  // Double tap
  DOUBLE_TAP_WINDOW_MS: 350,
} as const;

// =============================================================================
// CARD FEEDBACK
// =============================================================================
export const FEEDBACK_CONFIG = {
  // Scale multipliers
  HOVER_SCALE: 1.04,               // 4% bigger on hover
  SELECT_SCALE: 1.06,              // 6% bigger when selected

  // Wobble (makes cards feel alive)
  WOBBLE_INTENSITY: {
    IDLE: 0,
    HOVER: 0.015,                  // Subtle wobble
    SELECT: 0.02,                  // More noticeable
    DRAG: 0.025,                   // Most pronounced
  },
  WOBBLE_SPEED: {
    X: 4.5,                        // Hz
    Z: 3.8,                        // Hz (slightly different for organic feel)
  },

  // Tilt based on velocity
  VELOCITY_TILT_FACTOR: 0.12,      // How much velocity affects tilt
  MAX_TILT: 0.5,                   // Maximum tilt in radians (~28°)

  // Glow
  GLOW_OPACITY_HOVER: 0.15,
  GLOW_OPACITY_SELECT: 0.25,
  GLOW_OPACITY_DRAG: 0.4,
  GLOW_LERP_SPEED: 0.15,           // How fast glow fades in/out
} as const;

// =============================================================================
// PLAYED CARD ANIMATION
// =============================================================================
export const PLAY_ANIMATION = {
  // Timing
  LOCAL_DURATION: 0.35,            // Faster for local player
  OPPONENT_DURATION: 0.5,          // Slightly slower for opponents

  // Arc physics
  PEAK_HEIGHT_LOCAL: 0.6,          // How high local cards arc
  PEAK_HEIGHT_OPPONENT: 1.0,       // Opponents arc higher (coming from further)
  PEAK_TIME: 0.35,                 // When peak height is reached (0-1)

  // Randomization for natural feel
  THROW_STRENGTH_RANGE: [0.85, 1.15],  // ±15% variation
  GRAVITY_RANGE: [0.92, 1.08],         // ±8% variation
  ROTATION_RANGE: [-0.3, 0.3],         // Random rotation offset

  // Landing
  BOUNCE_INTENSITY: 0.03,          // How much cards bounce on landing
  BOUNCE_DECAY: 5,                 // How fast bounce settles
  BOUNCE_FREQUENCY: 12,            // Oscillation speed

  // Flip animation (opponent cards)
  FLIP_START: 0.15,                // When flip begins (0-1)
  FLIP_END: 0.65,                  // When flip completes (0-1)

  // In-flight wobble
  FLIGHT_WOBBLE_INTENSITY: 0.08,
  FLIGHT_WOBBLE_SPEED: 8,
  FLIGHT_SPIN_SPEED: 2,
} as const;

// =============================================================================
// COLLECTION ANIMATION
// =============================================================================
export const COLLECT_ANIMATION = {
  // Phase durations
  GATHER_DURATION: 0.35,           // Cards move to center
  WAIT_DURATION: 0.25,             // Pause at center
  FLY_DURATION: 0.4,               // Fly to winner

  // Movement
  GATHER_ARC_HEIGHT: 0.3,          // Arc during gather
  FLY_ARC_HEIGHT: 0.5,             // Arc during fly to winner

  // Wait phase
  HOVER_AMPLITUDE: 0.02,           // Gentle bob at center
  HOVER_SPEED: 3,                  // Hz

  // Scale
  END_SCALE: 0.3,                  // Cards shrink as they fly away
} as const;

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
  // Position relative to camera
  DISTANCE_FROM_CAMERA: 2.3,       // Units in front
  VERTICAL_OFFSET: -1.0,           // Units below center

  // Card arrangement
  PREFERRED_SPACING: 0.32,         // Ideal space between cards
  MIN_SPACING: 0.1,                // Minimum when hand is full
  ARC_HEIGHT: 0.18,                // How much middle cards are elevated
  FAN_ANGLE: 0.2,                  // Maximum rotation spread (radians)

  // Animation
  BREATHE_AMPLITUDE: 0.006,        // Gentle vertical bob
  BREATHE_SPEED: 0.0018,           // Hz (very slow)

  // Layout padding
  SCREEN_PADDING: 0.75,            // Use 75% of visible width
} as const;

// =============================================================================
// VISUAL EFFECTS
// =============================================================================
export const EFFECTS_CONFIG = {
  // Play zone indicator
  PLAY_ZONE_PULSE_SPEED: 4,        // Hz
  PLAY_ZONE_RING_ROTATION_SPEED: 1.5,

  // Ghost card
  GHOST_CARD_OPACITY: 0.35,
  GHOST_CARD_HOVER_AMPLITUDE: 0.015,

  // Particle effects
  TRICK_WIN_PARTICLE_COUNT: 30,
  AMBIENT_DUST_COUNT: 50,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate spring force
 */
export function springForce(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number,
  dt: number
): { value: number; velocity: number } {
  const force = (target - current) * stiffness;
  const newVelocity = (velocity + force * dt) * Math.pow(0.5, damping * dt);
  const newValue = current + newVelocity * dt;
  return { value: newValue, velocity: newVelocity };
}

/**
 * Smooth interpolation with configurable speed
 */
export function smoothLerp(current: number, target: number, speed: number): number {
  return current + (target - current) * speed;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ease out cubic for smooth deceleration
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in out cubic for smooth acceleration/deceleration
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Random value in range with optional seed for consistency
 */
export function randomInRange(min: number, max: number, seed?: number): number {
  const random = seed !== undefined
    ? Math.abs(Math.sin(seed * 9999.9))
    : Math.random();
  return min + random * (max - min);
}
