/**
 * Responsive layout policy thresholds and HUD layout tokens (see docs/client/hud-layout.md).
 *
 * `resolveLayoutPolicy` (hooks/layout) is the only place that compares viewport numbers with
 * these thresholds; components read the resulting LayoutPolicy instead of Tailwind breakpoints.
 */
import type { LayoutClass, LayoutProfile, TurnTimerPlacement } from '@/presentation/types/hud-layout.types';
import { CONSTANTS } from './constants';

export const RESPONSIVE_CONFIG = {
  /** Viewports narrower than this get the phone HUD */
  PHONE_MAX_WIDTH: CONSTANTS.BREAKPOINTS.MOBILE,
  /** Viewports shorter than this get the phone HUD (phones in landscape, short windows) */
  PHONE_MAX_HEIGHT: CONSTANTS.BREAKPOINTS.COMPACT_HEIGHT,

  /** Minimum touch target (Apple HIG / WCAG 2.5.5) for HUD controls on a coarse pointer */
  TAP_TARGET_MIN_PX: 44,
  /** Square HUD button size: the tap target on touch, a little smaller with a mouse */
  CONTROL_SIZE_PX: { COARSE: 44, FINE: 40 },

  MEDIA_QUERIES: {
    COARSE_POINTER: '(pointer: coarse)',
  },

  /** Profile used for server rendering, before the browser viewport is known */
  SERVER_PROFILE: {
    width: 1366,
    height: 768,
    orientation: 'landscape',
    coarsePointer: false,
  } satisfies LayoutProfile,
} as const;

/** Spacing of the HUD region grid. */
export const HUD_LAYOUT_CONFIG = {
  /** Distance of HUD regions from the viewport edge (safe-area insets are added on top) */
  GUTTER_PX: { compact: 8, regular: 16 },
  /** Gap between HUD regions and between slots inside a region */
  GAP_PX: 8,
} as const;

/**
 * Order of slots inside a HUD region (lower renders first: top of a column).
 * Slots portal into their region, so the order cannot depend on mount timing.
 */
export const HUD_SLOT_ORDER = {
  status: { statusBar: 0, turnTimer: 10 },
  prompt: { reconnecting: 0, newVersion: 5, bidding: 10, turnIndicator: 20, turnTimer: 30 },
  actions: { topBar: 0 },
  dock: { standings: 0 },
  social: { emotesAndChat: 0 },
  bottom: { standings: 0 },
  controls: { reactions: 0, biddingButton: 5, controlsButton: 10 },
} as const;

/**
 * Where the turn timer sits per layout class, and which way its soundboard opens. The bottom
 * centre belongs to the player's hand, so the timer stays in the top rows: centred in the prompt
 * row on portrait phones (narrow top bar), under the status bar everywhere else. Under the status
 * bar it has a fixed width (TurnTimerSize), so it never squeezes the prompt column.
 */
export const TURN_TIMER_PLACEMENT: Readonly<Record<LayoutClass, TurnTimerPlacement>> = {
  'phone-portrait': { region: 'prompt', order: HUD_SLOT_ORDER.prompt.turnTimer, align: 'center', opens: 'below', size: 'compact' },
  'phone-landscape': { region: 'status', order: HUD_SLOT_ORDER.status.turnTimer, align: 'left', opens: 'below', size: 'narrow' },
  tablet: { region: 'status', order: HUD_SLOT_ORDER.status.turnTimer, align: 'left', opens: 'below', size: 'regular' },
  desktop: { region: 'status', order: HUD_SLOT_ORDER.status.turnTimer, align: 'left', opens: 'below', size: 'regular' },
};

/**
 * Docking rule for the standings sidebar. With the camera centred on the table, a side panel
 * fits only when it is narrower than the strip the table leaves free beside it.
 */
export const STANDINGS_DOCK_CONFIG = {
  /** On-screen width of the table and seats as a fraction of the viewport height */
  TABLE_FOOTPRINT_HEIGHT_RATIO: 0.8,
  /** Space kept between the panel and the screen edge */
  EDGE_GUTTER_PX: 16,
} as const;
