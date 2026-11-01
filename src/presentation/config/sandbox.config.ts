/**
 * Animation sandbox configuration: audit thresholds and the dimensions the
 * audit matrix is built from. Thresholds are in world units and virtual milliseconds.
 */

export const SANDBOX_AUDIT = {
  // Per-object motion checks come from three-motion-audit with its default thresholds, which were
  // tuned on these cards (about 0.6 units across, moving at up to ~15 units/s, on the 60 Hz virtual
  // clock). The next three values are what Wizard Party sets on top (card-motion-audit.ts).
  // A thrown card leaves the hand at its fastest spin, easing out up to one turn over the shortest
  // throw (3 x ~6.6 rad / PLAY_ANIMATION.MIN_DURATION = ~38 rad/s at release): under the library's
  // 48 rad/s strobe limit, as intended.
  /** A dragged card's flight starts where the pointer let go, so the drag -> table handoff gets more slack (units). */
  HAND_HANDOFF_TOLERANCE: 0.6,
  /** The camera moving further than this in one frame (and out of line with its motion) is a visible cut. */
  MAX_CAMERA_STEP: 0.25,
  /**
   * Card centres below the felt by more than this clip through the table. The felt itself
   * tilts with the table shake (TABLE_SHAKE.INTENSITY rad over a ~3 unit radius), so the
   * tolerance covers that tilt.
   */
  BELOW_TABLE_TOLERANCE: 0.025,
  /** Virtual time a mounted scene may go without drawing a frame (Suspense, remounts) before it is flagged. */
  MAX_RENDER_STALL_MS: 200,
  /** Consecutive idle frames before a run counts as settled. */
  SETTLED_IDLE_FRAMES: 30,
  /** Wall-clock cost of one frame above which the run reports a slow frame (render budget). */
  SLOW_FRAME_COST_MS: 50,
  /** Virtual time the runner lets a scenario settle before final checks. */
  SETTLE_MS: 3500,
  /**
   * Real time allowed for the client, 3D scene and physics to load before a run starts. WebKit on
   * a software renderer measured 142 s to first ready frame, so this leaves room for it.
   */
  READY_TIMEOUT_REAL_MS: 180000,
  /** Frames the loaded scene renders before the scenario starts. */
  READY_SETTLE_FRAMES: 30,
  /** Frames to wait for the 3D hand to reflect a new turn before a gesture (R3F commits after the DOM). */
  GESTURE_READY_FRAMES: 3,
  /** Human-like pause between the two taps of a double tap. */
  DOUBLE_TAP_GAP_MS: 120,
  /** Virtual time a played card may take to leave the hand after its play command. */
  PLAY_ACK_TIMEOUT_MS: 1500,
  /** Default virtual timeout for waitFor steps. */
  WAIT_TIMEOUT_MS: 15000,
  /** Cap on timeline entries kept in a report. */
  MAX_TIMELINE_ENTRIES: 1500,
  /** Frames a snapshot renders after pausing the clock, so pending commits and uploads are on screen. */
  SNAPSHOT_SETTLE_FRAMES: 3,
  /** Real time a held snapshot or external step waits for its driver before the run moves on. */
  HOLD_TIMEOUT_REAL_MS: 120000,
  /**
   * Virtual time a lost WebGL context gets to draw again after it was restored. The game's own
   * recovery remounts the canvas after about 2 s, so this covers either path.
   */
  CONTEXT_RESTORE_TIMEOUT_MS: 5000,
  /** Real time a snapshot waits for three.js loaders (textures, environment maps) to finish. */
  SNAPSHOT_LOAD_TIMEOUT_REAL_MS: 15000,
  /** Real-time poll interval while a snapshot waits for loads. */
  SNAPSHOT_LOAD_POLL_REAL_MS: 50,
} as const;

/** Defaults of the fault-injection steps. */
export const SANDBOX_FAULTS = {
  /** Close code a server uses when a newer connection of the same player replaces this one. */
  SUPERSEDED_CLOSE_CODE: 4000,
  SUPERSEDED_CLOSE_REASON: 'superseded',
  /** Virtual time before a lost WebGL context is restored when the step names none. */
  CONTEXT_RESTORE_AFTER_MS: 500,
  /** Gap between messages of a social burst when the step names none (0: all at once). */
  SOCIAL_INTERVAL_MS: 0,
} as const;

export type SandboxFormFactor = 'phone' | 'tablet' | 'desktop';

export interface SandboxViewport {
  id: string;
  width: number;
  height: number;
  /** CSS device pixel ratio of the emulated device. */
  deviceScaleFactor: number;
  /** Mobile browser emulation (meta viewport, mobile user agent). Firefox ignores it. */
  isMobile: boolean;
  /** Touch input (coarse pointer). Tablets have it whether or not they count as "mobile". */
  hasTouch: boolean;
  /** Which playability thresholds apply (legibility, tap targets). */
  formFactor: SandboxFormFactor;
}

/**
 * The viewport matrix every layout and playability check runs against: the smallest and most
 * common phones in both orientations, a folded foldable, small and large tablets in both
 * orientations, and laptop to 4K desktops. Ids are stable; reports, audit presets and the
 * e2e playability suite use them.
 */
export const SANDBOX_VIEWPORTS: readonly SandboxViewport[] = [
  // Phones, portrait
  { id: 'small-phone', width: 320, height: 568, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'galaxy-fold-folded', width: 344, height: 882, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'android-small', width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'iphone-se', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'phone-portrait', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'iphone-15', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'pixel-7', width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, formFactor: 'phone' },
  // Phones, landscape (Safari's visible area is shorter than the screen)
  { id: 'phone-landscape-narrow', width: 750, height: 340, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'phone-landscape', width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  { id: 'iphone-15-landscape', width: 852, height: 393, deviceScaleFactor: 3, isMobile: true, hasTouch: true, formFactor: 'phone' },
  // Tablets
  { id: 'ipad-mini-portrait', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'tablet' },
  { id: 'tablet-portrait', width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'tablet' },
  { id: 'ipad-mini-landscape', width: 1024, height: 768, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'tablet' },
  { id: 'ipad-pro-portrait', width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'tablet' },
  { id: 'ipad-pro-landscape', width: 1366, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true, formFactor: 'tablet' },
  // Desktops
  { id: 'laptop', width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false, formFactor: 'desktop' },
  { id: 'desktop', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, formFactor: 'desktop' },
  { id: 'qhd', width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, formFactor: 'desktop' },
  { id: 'uhd-4k', width: 3840, height: 2160, deviceScaleFactor: 1, isMobile: false, hasTouch: false, formFactor: 'desktop' },
];

export const SANDBOX_FORM_FACTOR_BREAKPOINTS = {
  /** Phones have a shorter side below this, in either orientation. */
  TABLET_MIN_SHORT_SIDE_PX: 600,
  /** Tablets top out at the 12.9" iPad Pro's 1366 CSS px on the long side. */
  TABLET_MAX_LONG_SIDE_PX: 1366,
} as const;

/**
 * Classifies a live window the way SANDBOX_VIEWPORTS classifies its entries: the shorter side
 * separates phones, and a touch screen up to tablet size is a tablet (a 1366x768 laptop is not).
 */
export function formFactorOf(width: number, height: number, hasTouch: boolean): SandboxFormFactor {
  if (Math.min(width, height) < SANDBOX_FORM_FACTOR_BREAKPOINTS.TABLET_MIN_SHORT_SIDE_PX) return 'phone';
  if (hasTouch && Math.max(width, height) <= SANDBOX_FORM_FACTOR_BREAKPOINTS.TABLET_MAX_LONG_SIDE_PX) return 'tablet';
  return 'desktop';
}

export const SANDBOX_PLAYER_COUNTS = [3, 4, 5, 6] as const;

export const SANDBOX_DEFAULTS = {
  PLAYER_COUNT: 4,
  ROUND: 3,
  SEED: 7,
} as const;
