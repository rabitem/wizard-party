/**
 * The start page's realm hall: the active realm's own game room (ThemedEnvironment, the casino
 * for Classic) and table, which the camera walks through as the page scrolls. Coordinates are the
 * game scene's: the table at the origin, its top near y 0, the room's walls ~13 units out
 * (CAMERA_ENVELOPE). Stops stay inside that envelope and below every room's lowest beam.
 */
import { CAMERA_CONFIG } from './layout.config';

export type Vec3 = readonly [number, number, number];

/** One camera stop: where the camera stands and what it looks at. */
export interface HallCameraStop {
  position: Vec3;
  target: Vec3;
}

export const REALM_HALL = {
  CAMERA_FOV: 46,
  /** Device pixel ratio cap: the room is a backdrop here, not the game. */
  MAX_DPR: 1.5,
  /** How quickly the camera eases toward the scroll position (per second, exponential). */
  CAMERA_EASE: 6,
  /**
   * Stops in page order; HallStation sections map onto them one to one: the room's edge, four
   * turns around the table, and the player's own seat (the game's desktop camera). Between the
   * first and last, each target sits beside the table rather than on it, so the table fills one
   * half of the view and the station's text the other (the HallStation sides in StartHall).
   */
  STOPS: [
    // From the edge of the room the target sits below the table, lifting it into the gap
    // between the hanging sign at the top of the page and the host stand at the bottom.
    { position: [0, 3.4, 12.5], target: [0, -0.9, 0] },
    { position: [9, 3.5, 9], target: [2.5, 0.3, -2.5] },
    { position: [-9, 3, 6], target: [-1.9, 0.3, -2.8] },
    { position: [4, 1.8, -7.5], target: [-2.6, 0.2, -1.5] },
    { position: [-6, 2.4, -6.5], target: [2.1, 0.3, -2] },
    { position: CAMERA_CONFIG.DESKTOP.POSITION, target: [0, 0, 0] },
  ] satisfies HallCameraStop[],
} as const;
