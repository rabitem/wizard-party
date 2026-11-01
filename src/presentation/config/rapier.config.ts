/**
 * Rapier Physics Engine Configuration
 * Centralized physics constants for true rigid body simulation
 */

import { Vector3Tuple } from "three";

// =============================================================================
// PHYSICS WORLD CONFIGURATION
// =============================================================================
export const RAPIER_WORLD = {
  /** Gravity vector [x, y, z] - standard Earth gravity */
  GRAVITY: [0, -9.81, 0] as Vector3Tuple,

  /** Physics timestep (1/60 = 60 FPS physics) */
  TIMESTEP: 1 / 60,

  /** Solver iterations for constraint resolution */
  SOLVER_ITERATIONS: 4,

  /** Enable debug wireframes in development */
  DEBUG: false,
} as const;

// =============================================================================
// COLLISION GROUPS (Bitmask)
// =============================================================================
export const COLLISION_GROUPS = {
  /** Playing cards (dynamic bodies) */
  CARD: 0b000001,

  /** Table surface (static body) */
  TABLE: 0b000010,

  /** Trump zone in center (sensor/trigger) */
  TRUMP_ZONE: 0b000100,

  /** Play zone boundary (sensor) */
  PLAY_ZONE: 0b001000,

  /** Table decorations (chips, coasters - can be knocked by cards) */
  DECORATION: 0b010000,

  /** Trump indicator (3D icon in center - can be knocked by cards) */
  TRUMP_INDICATOR: 0b100000,

  /** All groups */
  ALL: 0b111111,
} as const;

/**
 * Create collision group membership and filter
 * @param membership - Which groups this body belongs to
 * @param filter - Which groups this body collides with
 */
export function interactionGroups(membership: number, filter: number): number {
  return (membership << 16) | filter;
}

// =============================================================================
// CARD RIGID BODY PROPERTIES
// =============================================================================
export const CARD_PHYSICS = {
  /** Card mass in kg (tuned for heavier, more satisfying throws) */
  MASS: 0.008,

  /** Friction coefficient (card on felt - slightly increased for better table grip) */
  FRICTION: 0.5,

  /** Restitution/bounciness (increased for satisfying multi-bounce landing) */
  RESTITUTION: 0.3,

  /** Linear damping (reduced for cards to travel further with longer flight) */
  LINEAR_DAMPING: 0.3,

  /** Angular damping (reduced for more visible tumble during flight) */
  ANGULAR_DAMPING: 0.5,

  /** Enable continuous collision detection (prevents tunneling) */
  CCD_ENABLED: true,

  /** Collision groups: cards collide with table, other cards, decorations, and trump indicator */
  COLLISION_MEMBERSHIP: COLLISION_GROUPS.CARD,
  COLLISION_FILTER:
    COLLISION_GROUPS.TABLE |
    COLLISION_GROUPS.CARD |
    COLLISION_GROUPS.TRUMP_ZONE |
    COLLISION_GROUPS.DECORATION |
    COLLISION_GROUPS.TRUMP_INDICATOR,
} as const;

// =============================================================================
// TABLE SURFACE PROPERTIES
// =============================================================================
export const TABLE_PHYSICS = {
  /** Friction coefficient (felt surface) */
  FRICTION: 0.6,

  /** Restitution (soft felt absorbs impact) */
  RESTITUTION: 0.1,

  /** Table dimensions */
  RADIUS: 2.5,
  THICKNESS: 0.1,
  HEIGHT: 0.02, // Y position of table surface (matches FELT_Y)

  /** Collision groups: table collides with cards, decorations, and trump indicator */
  COLLISION_MEMBERSHIP: COLLISION_GROUPS.TABLE,
  COLLISION_FILTER:
    COLLISION_GROUPS.CARD |
    COLLISION_GROUPS.DECORATION |
    COLLISION_GROUPS.TRUMP_INDICATOR,
} as const;

// =============================================================================
// TRUMP ZONE COLLIDER (Center of table)
// =============================================================================
export const TRUMP_ZONE_PHYSICS = {
  /** Hard collision radius - cards cannot enter */
  HARD_RADIUS: 0.55,

  /** Soft collision radius - gradual push-back starts */
  SOFT_RADIUS: 0.8,

  /** Push-back force strength */
  PUSH_FORCE: 10.0,

  /** Card lift when colliding */
  COLLISION_LIFT: 0.2,

  /** Extra tilt when colliding (radians) */
  COLLISION_TILT: 0.5,

  /** Height of the collision cylinder */
  HEIGHT: 1.0,

  /** Collision groups: sensor only */
  COLLISION_MEMBERSHIP: COLLISION_GROUPS.TRUMP_ZONE,
  COLLISION_FILTER: COLLISION_GROUPS.CARD,
} as const;

// =============================================================================
// REST DETECTION & SLEEP MANAGEMENT
// =============================================================================
export const REST_DETECTION = {
  /** Linear velocity threshold to consider card at rest */
  LINEAR_VELOCITY_THRESHOLD: 0.08,

  /** Angular velocity threshold to consider card at rest */
  ANGULAR_VELOCITY_THRESHOLD: 0.1,

  /** Wake-up linear velocity threshold (hysteresis - higher than rest threshold) */
  WAKE_LINEAR_THRESHOLD: 0.15,

  /** Wake-up angular velocity threshold (hysteresis) */
  WAKE_ANGULAR_THRESHOLD: 0.2,

  /** Number of consecutive frames at rest before triggering onRest callback */
  FRAMES_UNTIL_REST: 20,

  /** Minimum time (ms) between rest state changes to prevent oscillation */
  REST_DEBOUNCE_MS: 100,

  /** Check interval in milliseconds */
  CHECK_INTERVAL_MS: 33, // ~30 FPS for rest checks

  /** Y position threshold - cards below table are considered fallen */
  FALLEN_Y_THRESHOLD: -1.0,
} as const;

// =============================================================================
// COLLISION RESPONSE
// =============================================================================
export const COLLISION_RESPONSE = {
  /** Minimum impact velocity to trigger collision feedback */
  MIN_IMPACT_VELOCITY: 0.3,

  /** Maximum impact velocity for clamping */
  MAX_IMPACT_VELOCITY: 8.0,

  /** Collision force dampening for card-to-card impacts */
  CARD_COLLISION_DAMPING: 0.6,

  /** Lift impulse when cards collide (prevents overlap) */
  COLLISION_LIFT_FACTOR: 0.1,

  /** Angular impulse factor from collision normal */
  COLLISION_SPIN_FACTOR: 0.05,

  /** Minimum impulse magnitude to report */
  MIN_IMPULSE_MAGNITUDE: 0.01,
} as const;
