/**
 * Responsive layout policy and HUD region types (see docs/client/hud-layout.md).
 *
 * One `LayoutProfile` (raw viewport facts) feeds one `LayoutPolicy` (every form-factor decision
 * the game HUD makes). Components read the policy instead of re-deriving breakpoints.
 */

/** Where the standings panel lives (user setting). Single definition for settings and HUD. */
export type LeaderboardPosition = 'hidden' | 'left' | 'right' | 'bottom';

/** Form factor the HUD is laid out for. */
export type LayoutClass = 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop';

export type ViewportOrientation = 'portrait' | 'landscape';

/** Raw viewport facts, read once from the browser and shared by every consumer. */
export interface LayoutProfile {
  /** Layout viewport width in CSS px */
  width: number;
  /** Layout viewport height in CSS px */
  height: number;
  orientation: ViewportOrientation;
  /** The primary pointer is a finger, so controls need touch-sized targets */
  coarsePointer: boolean;
}

/** Bidding UI: a bottom sheet (portrait phones) or a panel in the prompt region. */
export type BiddingSurface = 'sheet' | 'panel';

/** Density of inline HUD panels: 'compact' trades labels for space on short viewports. */
export type HudDensity = 'compact' | 'regular';

/** 3D camera preset the scene starts from. */
export type CameraPreset = 'mobile' | 'desktop';

/** How the standings are shown: docked beside the table, a popover from the top bar, or a sheet. */
export type StandingsMode = 'docked' | 'popover' | 'sheet';

/** Every form-factor decision of the game HUD, derived from one LayoutProfile. */
export interface LayoutPolicy {
  profile: LayoutProfile;
  layoutClass: LayoutClass;
  /** Phone HUD: one controls button and sheets instead of the persistent desktop panels */
  compactHud: boolean;
  biddingSurface: BiddingSurface;
  /** Density of the docked panels (bidding panel, status bar) */
  density: HudDensity;
  cameraPreset: CameraPreset;
  /** Minimum size of interactive HUD controls in px; 0 when the pointer is fine */
  tapTargetPx: number;
  /** Prompts (bidding, turn notice) get their own row under the top bar instead of its centre */
  promptBelowTopBar: boolean;
  /** Region and popover direction of the turn timer */
  turnTimer: TurnTimerPlacement;
}

/** Horizontal anchor of a HUD popover relative to the element that opens it. */
export type HudPanelAlign = 'left' | 'center' | 'right';

/**
 * Width of the turn timer. A timer that shares an edge column of the top row (status region)
 * has a fixed width, so a long player name cannot widen the column and squeeze the prompt
 * column (bidding panel) between it and the top-bar buttons.
 * - `narrow`: fixed and slim, without the phase label (landscape phones)
 * - `compact`: grows with the name in its own full-width row (portrait phones)
 * - `regular`: fixed, with room for long names (tablets and desktops)
 */
export type TurnTimerSize = 'narrow' | 'compact' | 'regular';

/** Placement of the turn timer for one layout class (see TURN_TIMER_PLACEMENT). */
export interface TurnTimerPlacement {
  region: HudRegion;
  /** Position inside the region (HUD_SLOT_ORDER) */
  order: number;
  /** Anchor of its soundboard popover */
  align: HudPanelAlign;
  /** The soundboard opens above (bottom regions) or below (top regions) */
  opens: 'above' | 'below';
  size: TurnTimerSize;
}

/**
 * Screen strips covered by HUD chrome, in CSS px from each edge of the game viewport.
 * The remaining rectangle is free for the table; the 3D framing can fit the scene into it.
 */
export interface HudInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Named, non-overlapping HUD regions. Components render into them with `HudSlot`. */
export type HudRegion =
  | 'status'
  | 'prompt'
  | 'actions'
  | 'dock-left'
  | 'dock-right'
  | 'social'
  | 'bottom'
  | 'controls';
