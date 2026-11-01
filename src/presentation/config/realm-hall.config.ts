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
  /** A warm fill light over the room, on top of the game's own lighting */
  FILL: { SKY: '#ffe2b8', GROUND: '#2a1c10', INTENSITY: 0.9 },
  /**
   * Stops in page order; HallStation sections map onto them one to one: the room's edge, four
   * turns around the table, and the player's own seat (the game's desktop camera). Between the
   * first and last, each target sits beside the table rather than on it, so the table fills one
   * half of the view and the station's text the other (the HallStation sides in StartHall).
   */
  STOPS: [
    // The edge of the room, looking down over the table: the back wall and its signs fall above the
    // frame, so the room's busiest props stay clear of the wordmark.
    { position: [0, 7, 11], target: [0, -2.8, -1.5] },
    // The back wall (the casino's sign, the manor's windows, the barn doors), left of the text panel.
    { position: [7.5, 2.6, 6], target: [3, 2.6, -11] },
    // The left wall's props, past the table, to the right of the text; high and looking down, so
    // the rooms' unlit ceilings stay out of frame.
    { position: [5, 4.6, -1], target: [-12, -0.8, 1.5] },
    // Over the felt, looking along it to the right wall: the table fills the left of the frame.
    { position: [-6.5, 4.4, 4], target: [12, -1.4, -4] },
    // Across the table into the lit back corner (signs, machines, windows), right of the text panel.
    { position: [-6, 4.2, 8], target: [6, 1.2, -11] },
    { position: CAMERA_CONFIG.DESKTOP.POSITION, target: [0, 0, 0] },
  ] satisfies HallCameraStop[],
  /**
   * Stops that differ on portrait screens (phones), by index into STOPS. There the panels span the
   * full width, so a stop's feature has to sit above its panel rather than beside it.
   */
  PORTRAIT_STOPS: {
    // The back wall's sign centred over the notices panel.
    1: { position: [0, 2.4, 8], target: [0, 0.4, -11] },
  } satisfies Record<number, HallCameraStop>,
} as const;

/** The camera path for a viewport's aspect ratio (width / height). */
export function hallStopsFor(aspect: number): readonly HallCameraStop[] {
  if (aspect >= 1) return REALM_HALL.STOPS;
  return REALM_HALL.STOPS.map((stop, index) => (REALM_HALL.PORTRAIT_STOPS as Partial<Record<number, HallCameraStop>>)[index] ?? stop);
}

/** The player lookup in the top-right dock (ProfileSearch). */
export const PROFILE_SEARCH = {
  /** Wait this long after the last keystroke before asking the server */
  DEBOUNCE_MS: 250,
  /** Shortest query worth sending (SOCIAL_LIMITS.SEARCH_MIN_LENGTH on the server) */
  MIN_LENGTH: 2,
} as const;

/** The loader shown while the room loads, and while a realm switch loads the next one (HallLoader). */
export const HALL_LOADER = {
  /** Shown only when loading takes longer than this, so a fast load never flashes */
  SHOW_DELAY_MS: 180,
  /** A realm switch waits this long after showing the loader, so it paints before the switch blocks the main thread */
  CURTAIN_MS: 160,
  /** Once a realm switch shows the loader, it stays at least this long */
  MIN_VISIBLE_MS: 1100,
  /** A load that stalls longer than this no longer holds the loader over the page */
  MAX_VISIBLE_MS: 12_000,
  /** How long each line stays before the next */
  LINE_MS: 2600,
  LINES: [
    'Polishing the Wizards. They insist.',
    'Teaching the Jesters to keep a straight face.',
    'Counting to sixty. Twice, just to be sure.',
    'Asking trump which suit it feels like today.',
    'Reminding the bots that zero is a perfectly good bid.',
    'Shuffling. Then shuffling again, because someone was watching.',
    'Dusting the felt and warming up the lamps.',
    'Looking for the fifth Wizard. There are only four.',
    'Convincing the 13 of hearts it is not a trump card.',
    'Sharpening the pencil for the score sheet.',
  ],
} as const;
