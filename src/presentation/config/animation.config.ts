/**
 * Animation configuration for card game: play animations, collection, and shuffle/sort.
 * Part of the physics configuration module system.
 */

// =============================================================================
// PLAYED CARD ANIMATION
// =============================================================================
export const PLAY_ANIMATION = {
  // Timing
  LOCAL_DURATION: 0.5,             // Baseline local throw duration before distance adjustment
  OPPONENT_DURATION: 0.65,         // Baseline opponent throw duration before distance adjustment
  MIN_DURATION: 0.52,              // Prevent snappy sub-half-second table snaps
  MAX_DURATION: 1.0,               // Keep long animations bounded
  SLOW_DROP_DURATION: 0.68,        // Gentle releases should read as falling, not flicking
  DISTANCE_DURATION_PER_UNIT: 0.08,
  DISTANCE_DURATION_MAX_BONUS: 0.2,
  SPEED_DURATION_REDUCTION_PER_UNIT: 0.012,
  SPEED_DURATION_MAX_REDUCTION: 0.1,

  // Arc physics (parabolic)
  PEAK_HEIGHT_LOCAL: 0.7,          // How high local cards arc
  PEAK_HEIGHT_OPPONENT: 1.2,       // Opponents arc higher
  PEAK_TIME: 0.4,                  // When peak height is reached
  GRAVITY: 4.5,                    // Gravity constant for parabolic motion

  // Randomization for natural feel
  THROW_STRENGTH_RANGE: [0.75, 1.25] as [number, number],  // ±25%
  GRAVITY_RANGE: [0.85, 1.15] as [number, number],         // ±15%
  ROTATION_RANGE: [-0.4, 0.4] as [number, number],         // ±0.4 rad

  // Landing: multi-bounce with coefficient of restitution
  BOUNCE_START: 0.75,              // When bounce phase begins
  BOUNCE_INTENSITY: 0.045,         // Initial bounce height
  BOUNCE_DECAY: 6,
  BOUNCE_FREQUENCY: 15,
  COEFFICIENT_OF_RESTITUTION: 0.3, // How bouncy (0-1, cards are low)
  SECONDARY_BOUNCE_FACTOR: 0.4,    // Second bounce is 40% of first
  TERTIARY_BOUNCE_FACTOR: 0.2,     // Third bounce is 20% of first (triple-bounce landing)

  // Flip animation (opponent cards)
  FLIP_START: 0.12,
  FLIP_END: 0.6,

  // In-flight wobble
  FLIGHT_WOBBLE_INTENSITY: 0.12,
  FLIGHT_WOBBLE_SPEED: 10,
  FLIGHT_SPIN_SPEED: 2.5,

  // 3D tumble effect
  TUMBLE_X_FACTOR: 0.3,            // Forward tumble during flight
  TUMBLE_Y_FACTOR: 0.15,           // Side spin during flight
  SLOW_DROP_BOUNCE_FACTOR: 0.25,   // Drops settle instead of trampoline-bouncing

  // Launch - continuity with the hand or dragged card the played card replaces
  START_SCALE: 0.6,                // Launch scale when no rendered origin pose is known
  SCALE_IN_SPEED: 1.5,             // Scale reaches full size at 1 / SCALE_IN_SPEED of the animation
  ORIGIN_BLEND_END: 0.15,          // Progress by which the held orientation has blended into the flight
} as const;

// =============================================================================
// COLLECTION ANIMATION
// =============================================================================
export const COLLECT_ANIMATION = {
  // Pre-collection delay (wait for last card to land before collecting)
  PRE_COLLECT_DELAY_MS: 500,       // Brief pause before collection starts

  // Phase durations - satisfying timing
  GATHER_DURATION: 0.2,            // Cards swoop to center together
  WAIT_DURATION: 0.08,             // Hover together at center (more anticipation)
  FLY_DURATION: 0.15,              // Each card flies to winner

  // Pacing (distance-aware, clamped) for PhysicsCollectingCard
  // Speeds are world units / second, durations in seconds.
  GATHER_SPEED: 7.0,
  GATHER_DURATION_MIN: 0.15,
  GATHER_DURATION_MAX: 0.3,
  FLY_SPEED: 7.0,
  FLY_DURATION_MIN: 0.2,
  FLY_DURATION_MAX: 0.35,
  // Gap between sequential card flights (seconds)
  FLY_STAGGER: 0.08,
  // Per-card duration jitter (+/- fraction) so a trick never moves in lockstep
  DURATION_JITTER: 0.05,

  // Movement
  GATHER_ARC_HEIGHT: 0.4,          // Nice arc when gathering
  FLY_ARC_HEIGHT: 0.35,            // Arc when flying to winner

  // Wait phase
  HOVER_AMPLITUDE: 0.015,          // Gentle bob at center
  HOVER_SPEED: 3,                  // Hz
  HOVER_SCALE: 0.85,               // Cards shrink slightly while hovering
  // Vertical gap between piled hovering cards: more than a hover-scaled card is thick,
  // so the pile never interpenetrates. The first card to fly sits on top.
  HOVER_STACK_SPACING: 0.025,

  // Scale
  END_SCALE: 0.5,                  // Cards shrink as they land on deck
} as const;

// =============================================================================
// SHUFFLE & SORT ANIMATION
// =============================================================================
export const SHUFFLE_SORT_ANIMATION = {
  // Shuffle - simple back and forth, cards sliding over each other
  SHUFFLE: {
    BASE_DURATION: 500,              // Base animation duration (ms)
    DURATION_PER_CARD: 20,           // Additional ms per card
  },
  // Sort - wave motion with satisfying slap
  SORT: {
    BASE_DURATION: 400,              // Base animation duration (ms)
    DURATION_PER_CARD: 80,           // Additional ms per card (based on wave delay)
    WAVE_HEIGHT: 0.35,               // How high wave lifts cards
    WAVE_SPEED: 2.5,                 // Wave propagation speed
    WAVE_DELAY_PER_CARD: 0.12,       // Stagger between cards
    SLAP_INTENSITY: 0.08,            // How hard cards slap down
    SLAP_BOUNCE: 0.06,               // Bounce on slap
    SLAP_WOBBLE: 0.04,               // Wobble after slap
    TILT_DURING_RISE: 0.15,          // Backward tilt while rising
  },
} as const;

/**
 * Calculate dynamic shuffle/sort animation duration based on card count
 */
export function getShuffleSortDuration(type: 'shuffle' | 'sort', cardCount: number): number {
  if (type === 'shuffle') {
    return SHUFFLE_SORT_ANIMATION.SHUFFLE.BASE_DURATION +
           cardCount * SHUFFLE_SORT_ANIMATION.SHUFFLE.DURATION_PER_CARD;
  }
  return SHUFFLE_SORT_ANIMATION.SORT.BASE_DURATION +
         cardCount * SHUFFLE_SORT_ANIMATION.SORT.DURATION_PER_CARD;
}

// =============================================================================
// TABLE SHAKE EFFECT
// =============================================================================
export const TABLE_SHAKE = {
  INTENSITY: 0.006,                // Max rotation in radians (~0.35 degrees)
  DURATION: 0.3,                   // Shake duration in seconds
  FREQUENCY: 28,                   // Oscillation frequency
  DECAY: 10,                       // How fast shake decays
  SETTLE_PER_60HZ_FRAME: 0.9,      // Return-to-rest factor per 1/60 s after the shake
  REST_EPSILON: 1e-5,              // Below this (radians) the table snaps to rest and stops moving
} as const;

// =============================================================================
// TURN INDICATOR PULSE
// =============================================================================
export const TURN_INDICATOR = {
  // Inner ring pulse
  OPACITY_BASE: 0.5,               // Base opacity
  OPACITY_RANGE: 0.2,              // Opacity oscillation ±
  OPACITY_SPEED: 3,                // Opacity pulse frequency (Hz)
  SCALE_RANGE: 0.08,               // Scale oscillation ±
  SCALE_SPEED: 2.5,                // Scale pulse frequency (Hz)
  ROTATION_SPEED: 0.3,             // Slow rotation speed

  // Outer expanding ring
  OUTER_CYCLE_SPEED: 0.8,          // Expansion cycle speed
  OUTER_SCALE_RANGE: 0.4,          // How much outer ring expands
  OUTER_MAX_OPACITY: 0.4,          // Outer ring starting opacity

  // Glow light
  GLOW_INTENSITY: 0.3,
  GLOW_DISTANCE: 0.8,
  GLOW_COLOR: '#ffd700',
} as const;
