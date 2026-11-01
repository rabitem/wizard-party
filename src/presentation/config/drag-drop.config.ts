/**
 * Drag and drop configuration for card interactions.
 * Part of the physics configuration module system.
 *
 * All drag distances are measured on the drag plane (y = DRAG_PLANE_Y), where the
 * dragged card sits directly under the pointer. The hand projects onto that plane
 * roughly 2.8-3.2 units from the table centre, so the play zone must sit clearly
 * inside that ring or a grab-and-release would play the card.
 */

// =============================================================================
// DRAG & DROP
// =============================================================================
export const DRAG_CONFIG = {
  // Play zone geometry (plane units from the table centre)
  PLAY_ZONE_RADIUS: 2.2,           // Drop inside this radius to play
  PLAY_ZONE_VISUAL_RADIUS: 2.0,    // Visual indicator slightly smaller
  PLAY_ZONE_ENTRY_THRESHOLD: 2.8,  // Proximity feedback starts here
  PLAY_ZONE_SNAP_RADIUS: 1.4,      // Inner snap zone
  MIN_PLAY_TRAVEL: 0.5,            // Card must move this far toward the centre before it can play

  // Trump symbol collision (center of table)
  TRUMP_MODEL_SCALE: 3,
  TRUMP_MODEL_BASE_RADIUS: 0.15,
  TRUMP_COLLISION_PADDING: 0.15,
  TRUMP_COLLISION_RADIUS: 0.42,
  TRUMP_COLLISION_SOFT_RADIUS: 0.62,
  TRUMP_COLLISION_FORCE: 10.0,     // Gentler push-back
  TRUMP_COLLISION_LIFT: 0.2,
  TRUMP_COLLISION_TILT: 0.5,

  // Drag plane
  DRAG_PLANE_Y: 0.35,              // Slightly lower for better table feel
  TABLE_EDGE_LIMIT: 3.5,           // |x| and |z| bound for the dragged card (the pickup point may lie beyond it)

  // Drag start
  DRAG_START_THRESHOLD_PX: 6,      // Pointer travel before a press becomes a drag (taps never hide the card)

  // Scale and elevation
  SCALE_MULTIPLIER: 1.2,           // Slightly less zoom for cleaner look
  HOVER_ELEVATION: 0.12,
  SELECT_ELEVATION: 0.18,
  DRAG_ELEVATION_BASE: 0.35,       // Lower drag height
  DRAG_ELEVATION_PROXIMITY: 0.25,

  // Flick detection (plane units per second)
  FLICK_VELOCITY_THRESHOLD: 2.5,   // Release speed that counts as a flick
  FLICK_DIRECTION_THRESHOLD: 0.3,  // Release direction must point toward the table centre
  MIN_FLICK_TRAVEL: 0.3,           // Jitter near the hand never counts as a flick
  VELOCITY_SAMPLE_COUNT: 4,        // Few samples for instant response

  // Slow drop detection - higher threshold means more "slow drops"
  SLOW_DROP_VELOCITY_THRESHOLD: 2.5,

  // Double tap
  DOUBLE_TAP_WINDOW_MS: 500,

  // Committed play: the dropped card stays on the table until the server confirms it
  HELD_PLAY_TIMEOUT_MS: 3000,      // Give up and return the card to the hand after this long

  // Hand card visual state on your playing turn (cards stay opaque; see HandCardVisualState)
  ILLEGAL_CARD: {
    TINT: 0.5,                     // Face brightness of a card you may not play
    DROP: 0.025,                   // Sinks a little below its slot
  },
  LEGAL_CARD_LIFT: 0.02,           // Playable cards rise a little above their slot

  // Hand card smoothing (per-frame factors at 60 fps, scaled by frame time)
  HOVER_TILT_LERP: 0.15,
  VISUAL_STATE_LERP: 0.1,
} as const;
