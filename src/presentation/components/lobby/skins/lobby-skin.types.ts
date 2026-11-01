import type { ComponentType, CSSProperties } from 'react';

/** Glyphs a lobby skin may replace. Hosts keep today's icon as the fallback (children). */
export type LobbyIconId =
  /** The big badge above the "Game Lobby" title (default: crown). */
  | 'emblem'
  /** The small "Host" marker under a seated player's name (default: crown). */
  | 'host'
  /** Inside the icon box of an empty seat (default: user silhouette). */
  | 'emptySeat'
  /** Inside the icon box of the "add bot" row (default: bot). */
  | 'addBot'
  /** Next to the start button label (default: crown). */
  | 'start'
  /** The small glyph in the footer divider (default: the fleur-de-lis character). */
  | 'divider';

/** Same contract as a lucide icon: sized purely by className (w-4 h-4 ...). */
export type LobbyIconComponent = ComponentType<{ className?: string }>;

/**
 * Which lobby panel hosts the decor (round-table lobby, lobby/table/):
 * - count:   the invite sheet
 * - players: the seat sheets (seat actions, fill an open seat)
 * - rules:   the table settings / rules sheet
 * - actions: the sticky bottom bar with Leave + Start / I'm ready
 *
 * Where the round table uses the other slots: Scene sits behind the top bar and the far side of the
 * table; AvatarFrameDecor frames each seat's 56px avatar; icons.host / icons.emptySeat replace the
 * seat crown and the open-seat plus; AddBotDecor + icons.addBot dress the "Seat a bot" block;
 * StartButtonDecor / startButtonStyle / copy.startReady|startWaiting style the host's start button
 * (mode 'guest' decorates the guest's "I'm ready" button while not ready). PlayerSlotDecor,
 * EmptySlotDecor, HeaderDecor and the remaining copy lines were made for the old row lobby and are
 * not rendered by the round table.
 */
export type LobbyPanelVariant = 'count' | 'players' | 'rules' | 'actions';

export interface LobbyPanelDecorProps {
  variant: LobbyPanelVariant;
}

/** One seated player row. `index` is the seat order (0-based), handy for alternating colours. */
export interface LobbySeatDecorProps {
  index: number;
  isLocal: boolean;
  isHost: boolean;
  isBot: boolean;
}

/** One empty seat placeholder; `index` counts the empty seats (0-based). */
export interface LobbyEmptySlotDecorProps {
  index: number;
}

/** The start area: host with enough players (ready), host waiting (waiting), or a guest (guest). */
export type LobbyStartMode = 'ready' | 'waiting' | 'guest';

export interface LobbyStartDecorProps {
  mode: LobbyStartMode;
}

/**
 * Visible flavour lines a skin may rename. The original English text stays the accessible name
 * (rendered `sr-only`); the flavour line is `aria-hidden`.
 */
export type LobbyCopyId =
  | 'title'
  | 'playersHeading'
  | 'waitingForPlayer'
  | 'startReady'
  | 'startWaiting'
  | 'waitingForHost';

/** Class slots a skin can append to its hosts (fonts, letter spacing, border style...). */
export type LobbyClassSlot = 'title' | 'playerRow' | 'emptySlot' | 'addBotRow' | 'startButton' | 'guestWaiting';

/**
 * A theme's LOBBY skin. Every field is optional; a missing field renders today's lobby.
 *
 * Decor contract (every decor component):
 * - rendered inside an `aria-hidden`, `pointer-events-none`, `absolute inset-0` wrapper that
 *   inherits the host's border radius; never change the host's size or layout, never add text
 *   that matters (decor text is invisible to screen readers)
 * - the host is `relative isolate`, so a layer with `-z-10` paints behind the host's content but
 *   above its background (use that for fills/motifs); layers without z-index paint ON TOP of the
 *   content, so keep those to the edges/corners
 * - front decor may overhang the host by up to ~8px (rows: the list gap is 8px) or ~14px
 *   (panels: sections are 16px apart); PanelBackdrop is clipped to the panel
 * - pure SVG/CSS, no external assets, no SVG ids (gradients/clipPaths/filters by id break when
 *   several copies render); animate only under `prefers-reduced-motion: no-preference`
 * - keep text readable: fills behind content stay dark (or low opacity) because lobby text is the
 *   light amber scale; the start button may repaint itself fully and set its own text colour
 *   through `startButtonStyle`
 * - must work from 320px wide rows upward; position with %/inset, not fixed x offsets. An
 *   absolutely positioned <svg> is a replaced element: insets alone do not stretch it, so give it
 *   an explicit width and height (e.g. `top:-25%; left:-25%; width:150%; height:150%`)
 */
export interface LobbySkin {
  /**
   * Illustrated vignette behind the lobby header (title, emblem, room code). Fills a box that
   * bleeds to the page edges, ~170px tall at 360px width, ~200px on desktop; the host adds a
   * soft dark scrim behind the title and fades the bottom edge, so keep the focal art left/right
   * and towards the bottom.
   */
  Scene?: ComponentType;
  /** Around the header emblem badge (48-56px square, rounded-2xl). */
  HeaderDecor?: ComponentType;
  /** Inside each panel, clipped to it and behind its content (pattern, texture, caustics). */
  PanelBackdrop?: ComponentType<LobbyPanelDecorProps>;
  /** On top of each panel's edges (corners, caps, tubes); may overhang. */
  PanelDecor?: ComponentType<LobbyPanelDecorProps>;
  /** Framing for each seated player row (towel, headstone plate, sled sign, arcade frame). */
  PlayerSlotDecor?: ComponentType<LobbySeatDecorProps>;
  /** Around a seated player's avatar box (32px mobile / 40px desktop). */
  AvatarFrameDecor?: ComponentType<LobbySeatDecorProps>;
  /** An empty seat: the right ~45% of the row is free for a "waiting" illustration. */
  EmptySlotDecor?: ComponentType<LobbyEmptySlotDecorProps>;
  /** The host's "add bot" row (difficulty picker + Add button fill most of it). */
  AddBotDecor?: ComponentType;
  /** The start button (ready/waiting) or the guest "waiting for host" box. */
  StartButtonDecor?: ComponentType<LobbyStartDecorProps>;
  /**
   * Style merged over the start button / guest box defaults, e.g. a new background and a text
   * colour that reads on it. When StartButtonDecor is set the default frame + corner accents of
   * the start button are hidden.
   */
  startButtonStyle?: Partial<Record<LobbyStartMode, CSSProperties>>;
  icons?: Partial<Record<LobbyIconId, LobbyIconComponent>>;
  copy?: Partial<Record<LobbyCopyId, string>>;
  classNames?: Partial<Record<LobbyClassSlot, string>>;
}
