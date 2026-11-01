/**
 * Centralized physics and animation configuration for the card game.
 * All physics constants in one place for easy tuning.
 *
 * This file re-exports all configuration modules for backwards compatibility.
 * For new code, consider importing directly from the specific module.
 */

// =============================================================================
// CARD PHYSICS (dimensions, springs, feedback, stacking)
// =============================================================================
export {
  TABLE_SURFACE,
  CARD_DIMENSIONS,
  getCardRestY,
  SPRING_CONFIG,
  FEEDBACK_CONFIG,
  CARD_STACKING,
} from './card-physics';

// =============================================================================
// DRAG & DROP
// =============================================================================
export { DRAG_CONFIG } from './drag-drop.config';

// =============================================================================
// ANIMATIONS (play, collect, shuffle/sort, table shake, turn indicator)
// =============================================================================
export {
  PLAY_ANIMATION,
  COLLECT_ANIMATION,
  SHUFFLE_SORT_ANIMATION,
  getShuffleSortDuration,
  TABLE_SHAKE,
  TURN_INDICATOR,
} from './animation.config';

// =============================================================================
// LAYOUT (camera)
// =============================================================================
export { CAMERA_CONFIG } from './layout.config';

// =============================================================================
// VISUAL EFFECTS (card landing dust)
// =============================================================================
export { CARD_LAND_DUST } from './effects.config';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
export {
  springForce,
  frameLerp,
  clamp,
  easeOutCubic,
  easeInOutCubic,
  seededRandom,
  gaussianRandom,
} from './physics-utils';
