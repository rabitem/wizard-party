/**
 * Shared configuration for the themed 3D surroundings ("table back").
 *
 * Per-theme layouts live in their own config files
 * (halloween-environment.config.ts, autumn-environment.config.ts) so each
 * stays small; this file holds the room shell, the table-rim placement rules
 * and shared effect limits.
 */

import type { ThemedFxId } from './theme-fx.config';

export type Vec3 = [number, number, number];

// =============================================================================
// ROOM SHELL
// =============================================================================
export const ENVIRONMENT_ROOM = {
  /** Floor height - matches the casino floor so table legs sit the same way */
  FLOOR_Y: -0.51,
  /** Half extents of the room footprint */
  HALF_WIDTH: 16,
  HALF_DEPTH: 15,
  HEIGHT: 10,
  /** Fog distances (near, far) */
  FOG_NEAR: 14,
  FOG_FAR: 42,
} as const;

// =============================================================================
// CAMERA ENVELOPE
// =============================================================================
/**
 * The space the scene camera may occupy in each room, so no fitted or orbited camera ever ends
 * up among (or above) beams, rafters or pergolas. OVERHEAD_Y is the underside of the lowest
 * geometry spanning the table area; the camera stays CLEARANCE below it. Rooms without
 * overhead geometry over the table use the casino ceiling. Update the entry whenever a room's
 * ceiling geometry changes (camera-framing tests check every room). Every themed room either
 * declares its overhead clearance or is open sky; the types below make a missing entry a
 * compile error.
 */
const ROOM_CEILING_Y = ENVIRONMENT_ROOM.FLOOR_Y + ENVIRONMENT_ROOM.HEIGHT;

/** Rooms with nothing over the table (rooftop, poolside): the default cap applies */
type OpenSkyRoomId = Extract<ThemedFxId, 'neon' | 'summer'>;
type CeilingRoomId = Exclude<ThemedFxId, OpenSkyRoomId>;

const OVERHEAD_Y: Readonly<Record<CeilingRoomId, number>> = {
  /** HauntedManorRoom: 0.45 beams under the ceiling */
  halloween: ROOM_CEILING_Y - 0.45,
  /** AlpineLodgeRoom: ridge beam centred 1.6 beams below the ceiling */
  winter: ROOM_CEILING_Y - 0.45 * 2.1,
  /** HarvestBarnRoom: purlins 1.5 beams below the ceiling */
  autumn: ROOM_CEILING_Y - 0.4 * 2,
  /** BlossomPavilion: pergola slats on the girders (PERGOLA_Y + girder, 0.34 deep) */
  spring: ENVIRONMENT_ROOM.FLOOR_Y + 7.4 + 0.42 - 0.17,
  /** DojoShell: ceiling beams */
  manga: ROOM_CEILING_Y - 0.36,
  /** GreenhouseAtrium: roof ribs */
  solarpunk: ROOM_CEILING_Y - 0.32,
  /** ObservatoryRoom dome base */
  celestial: ROOM_CEILING_Y,
  /** Arcade room shell */
  pixel: ROOM_CEILING_Y,
};

export const CAMERA_ENVELOPE = {
  /** Gap between the camera and the lowest overhead geometry */
  CLEARANCE: 0.6,
  /** Casino (default room) ceiling, also the cap for open-sky rooms */
  DEFAULT_OVERHEAD_Y: 12,
  /** Horizontal distance from the table centre the camera may reach (inside the walls) */
  MAX_HORIZONTAL_RADIUS: Math.min(ENVIRONMENT_ROOM.HALF_WIDTH, ENVIRONMENT_ROOM.HALF_DEPTH) - 1.5,
  /** Underside of the lowest overhead geometry over the table, per themed room (open-sky rooms use the default) */
  OVERHEAD_Y,
} as const;

function hasOverheadGeometry(tableThemeId: string): tableThemeId is CeilingRoomId {
  return Object.prototype.hasOwnProperty.call(OVERHEAD_Y, tableThemeId);
}

export interface CameraEnvelope {
  /** Highest camera position (world y) */
  maxHeight: number;
  /** Largest horizontal distance from the table centre */
  maxHorizontalRadius: number;
}

/** Camera envelope of the room shown for a table theme */
export function getCameraEnvelope(tableThemeId: string): CameraEnvelope {
  const overhead = hasOverheadGeometry(tableThemeId) ? OVERHEAD_Y[tableThemeId] : CAMERA_ENVELOPE.DEFAULT_OVERHEAD_Y;
  return {
    maxHeight: overhead - CAMERA_ENVELOPE.CLEARANCE,
    maxHorizontalRadius: CAMERA_ENVELOPE.MAX_HORIZONTAL_RADIUS,
  };
}

// =============================================================================
// TABLE RIM DECOR
// =============================================================================
/**
 * Visual-only decor sits on the wood rim ring (2.92 - 3.32 units from the
 * centre, see WoodRimBase.tsx). The playable felt ends at TABLE_PHYSICS.RADIUS
 * (2.5) and the drop-zone feedback at DRAG_CONFIG.PLAY_ZONE_ENTRY_THRESHOLD (2.8), so props here can
 * never block cards. Angles are measured like useBrandmarkPositions: 0 deg is
 * the local player's seat, increasing counter-clockwise from above.
 *
 * Player brandmarks use multiples of 60/72/90/120 deg and cup holders use
 * multiples of 60 deg; the safe slots below avoid all of them.
 */
export const TABLE_RIM_DECOR = {
  RADIUS: 3.12,
  /** Top of the wood rim ring (WoodRimBase sits at y = -0.02) */
  SURFACE_Y: -0.02,
  /** Safe angles (degrees) that never collide with seats or cup holders */
  SAFE_ANGLES_DEG: [30, 162, 198, 330] as const,
  /** Spread (degrees) for scattering small items around one slot */
  SLOT_SPREAD_DEG: 6,
} as const;

/** Angle offset that aligns rim angle 0 with the local player (front, +z). */
const RIM_ANGLE_ORIGIN = Math.PI / 2;
const DEG_TO_RAD = Math.PI / 180;

/** World position on the rim for an angle (deg) and optional radial offset. */
export function getRimPosition(angleDeg: number, radialOffset = 0, lift = 0): Vec3 {
  const angle = RIM_ANGLE_ORIGIN + angleDeg * DEG_TO_RAD;
  const radius = TABLE_RIM_DECOR.RADIUS + radialOffset;
  return [Math.cos(angle) * radius, TABLE_RIM_DECOR.SURFACE_Y + lift, Math.sin(angle) * radius];
}

/** Y rotation that makes a prop face the table centre from a rim angle. */
export function getRimFacingRotation(angleDeg: number): number {
  const angle = RIM_ANGLE_ORIGIN + angleDeg * DEG_TO_RAD;
  return -angle - Math.PI / 2;
}

// =============================================================================
// SHARED EFFECT LIMITS
// =============================================================================
export const ENVIRONMENT_EFFECTS = {
  /** Hard cap for any drifting particle system (leaves, snow, petals) */
  MAX_DRIFT_PARTICLES: 48,
  /** Candle/flame flicker */
  FLICKER_SPEED: 9,
  FLICKER_AMPLITUDE: 0.18,
  /** Glow sprite texture resolution */
  GLOW_TEXTURE_SIZE: 64,
} as const;
