import type { ComponentType } from 'react';

/** Every HUD glyph a skin may replace. Hosts pass a lucide fallback for each. */
export type HudIconId =
  | 'shuffle'
  | 'sort'
  | 'chat'
  | 'emotes'
  | 'stats'
  | 'settings'
  | 'trophy'
  | 'bid-plus'
  | 'bid-minus'
  | 'menu';

/** Same contract as a lucide icon: sized purely by className (w-4 h-4 ...). */
export type HudIconComponent = ComponentType<{ className?: string }>;

/**
 * Which kind of button hosts the decor:
 * - icon: square 36-48px HUD icon buttons (hand controls, top bar, chat/emote buttons)
 * - tile: large labelled tiles in the mobile controls sheet
 * - fab:  the floating mobile controls button
 * - bid:  the bid picker +/- buttons (often rounded-xl)
 */
export type HudButtonVariant = 'icon' | 'tile' | 'fab' | 'bid';

/**
 * Which panel hosts the decor:
 * - standings: the leaderboard side panel / sheet
 * - picker:    the bid picker panel / sheet
 * - status:    the round + trump status bar
 * - chat:      chat and emote panels / dropdowns
 */
export type HudPanelVariant = 'standings' | 'picker' | 'status' | 'chat';

export interface HudButtonDecorProps {
  variant: HudButtonVariant;
}

export interface HudPanelDecorProps {
  variant: HudPanelVariant;
  /**
   * The host clips its overflow (e.g. content inside a bottom sheet's scroll area), so ornaments
   * must stay inside the box instead of peeking over its edges.
   */
  contained: boolean;
}

/** Class slots a skin can append to its hosts (e.g. a different radius or font). */
export type HudClassSlot = 'button' | 'panel' | 'roundBadge';

/**
 * A theme's HUD skin. Every field is optional; a missing field renders today's look.
 *
 * Decor contract (all decor components):
 * - rendered inside an `aria-hidden`, `pointer-events-none`, `absolute inset-0` wrapper that
 *   inherits the host's border radius; never change the host's size or layout
 * - the host is `relative isolate`, so a layer with `-z-10` paints behind the host's content but
 *   above its background (use that for background motifs); layers without z-index paint on top
 * - unless `contained` is set, ornaments may overhang the panel edge by up to ~16px
 * - pure SVG/CSS, no external assets; animate only under `prefers-reduced-motion: no-preference`
 */
export interface HudSkin {
  icons?: Partial<Record<HudIconId, HudIconComponent>>;
  /** Rendered inside every HUD icon button, between its frame and its icon/label. */
  ButtonDecor?: ComponentType<HudButtonDecorProps>;
  /** Rendered inside the standings panel, bid picker, status bar and chat/emote panels. */
  PanelDecor?: ComponentType<HudPanelDecorProps>;
  /** Rendered around/behind the round counter in the status bar. */
  RoundBadgeDecor?: ComponentType;
  /** Extra classes appended to the hosts of each slot. */
  classNames?: Partial<Record<HudClassSlot, string>>;
}
