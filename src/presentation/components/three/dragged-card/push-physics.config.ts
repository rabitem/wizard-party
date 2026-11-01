// =============================================================================
// PUSH PHYSICS CONFIGURATION
// =============================================================================

/**
 * Configuration constants for card-to-card push physics during drag operations.
 */
export const PUSH_PHYSICS = {
  /** Soft push radius - visual feedback starts */
  SOFT_RADIUS: 0.45,
  /** Hard push radius - card cannot overlap */
  HARD_RADIUS: 0.25,
  /** Push force strength */
  PUSH_FORCE: 0.4,
  /** Velocity influence on push direction */
  VELOCITY_INFLUENCE: 0.3,
  /** Lift per colliding card */
  LIFT_PER_CARD: 0.06,
  /** Maximum lift from card collisions */
  MAX_LIFT: 0.18,
  /** Tilt intensity during collision */
  COLLISION_TILT: 0.15,
  /** Wobble intensity during collision */
  COLLISION_WOBBLE: 0.04,
  /** Scale pulse intensity during collision */
  SCALE_PULSE: 0.03,
  /** Position lerp speed for push response */
  PUSH_LERP: 0.5,
} as const;

/**
 * Smoothing of the dragged card's collision feedback. Lerp rates are per-frame factors at
 * 60 fps and decays are per-frame multipliers at 60 fps; both are scaled by frame time.
 */
export const DRAG_COLLISION_SMOOTHING = {
  /** Trump zone collision intensity */
  TRUMP_INTENSITY_LERP: 0.25,
  /** Trump zone push-out direction */
  TRUMP_NORMAL_LERP: 0.3,
  /** Trump zone lift and tilt */
  TRUMP_LIFT_TILT_LERP: 0.2,
  /** Trump zone lift and tilt fade once the card leaves the zone */
  TRUMP_RELEASE_DECAY: 0.85,
  /** Card-to-card push intensity */
  PUSH_INTENSITY_LERP: 0.3,
  /** Card-to-card push direction */
  PUSH_NORMAL_LERP: 0.25,
  /** Card-to-card lift and tilt */
  PUSH_LIFT_TILT_LERP: 0.2,
  /** Card-to-card scale pulse */
  PUSH_SCALE_PULSE_LERP: 0.3,
  /** Push wobble phase fade once the push ends */
  PUSH_WOBBLE_DECAY: 0.9,
  /** Push wobble phase speed (radians per second at full intensity) */
  PUSH_WOBBLE_SPEED: 12,
} as const;
