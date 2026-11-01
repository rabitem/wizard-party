/**
 * Visual effects configuration: the dust puff when a card lands on the table.
 * Part of the physics configuration module system.
 */

export const CARD_LAND_DUST = {
  PARTICLE_COUNT: 28,
  DURATION: 1.0,
  COLOR_PRIMARY: '#c4a574',        // Felt dust color (tan/beige)
  COLOR_LIGHT: '#e8dcc8',          // Light dust particles
  COLOR_DARK: '#8b7355',           // Dark dust particles
  SPREAD_SPEED_MIN: 0.3,
  SPREAD_SPEED_MAX: 1.0,
  UPWARD_MIN: 0.25,                // Minimum upward velocity
  UPWARD_MAX: 0.7,
  GRAVITY: -0.8,                   // Light gravity so the dust floats
  DRAG: 0.92,                      // Air resistance
  PARTICLE_SIZE: 0.04,
  MAX_OPACITY: 0.7,                // Starting opacity
  // Secondary settling wave
  SETTLE_PHASE_START: 0.6,         // When settle begins
  SETTLE_DRIFT_UP: 0.15,           // Slight upward drift during settle
} as const;
