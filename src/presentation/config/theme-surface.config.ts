/**
 * Theme-aware CSS values for panels and overlays, built on the per-theme surface variables
 * (--page-base / --page-bg / --surface / --surface-border / --glow, see src/app/theme-palettes.css).
 *
 * The mixes are tuned so the Dark theme reproduces the classic hard-coded tavern look
 * (#1a1510 -> #0d0b08 panels with a faint brown glow) while every other theme follows its palette.
 */

/** Darken a surface color toward black by the given share (0-100). */
const shade = (share: number) => `color-mix(in srgb, var(--surface), black ${share}%)`;

/** A translucent version of the theme glow (share 0-100 of its own alpha). */
const glowAt = (share: number) => `color-mix(in srgb, var(--glow) ${share}%, transparent)`;

/** The theme surface at the given share (0-100) of its own alpha. */
const surfaceAt = (share: number) => `color-mix(in srgb, var(--surface) ${share}%, transparent)`;

/** A darkened surface (see shade) at the given share of its own alpha. */
const shadeAt = (darken: number, share: number) => `color-mix(in srgb, ${shade(darken)} ${share}%, transparent)`;

/** Amber-scale tint (remapped per theme by theme-palettes.css). */
const amberTint = (step: number, share: number) =>
  `color-mix(in srgb, var(--color-amber-${step}) ${share}%, transparent)`;

export const THEME_SURFACE = {
  /** Panel / card fill: the theme surface fading slightly darker toward the bottom. */
  PANEL_BG: `linear-gradient(180deg, var(--surface) 0%, ${shade(30)} 50%, ${shade(50)} 100%)`,
  /** Panel fill that fades only to the shaded tone (banners, sheets). */
  BANNER_BG: `linear-gradient(180deg, var(--surface) 0%, ${shade(50)} 100%)`,
  /** Large hero/header panel shadow: inner vignette plus a soft theme glow. */
  PANEL_SHADOW_GLOW: `inset 0 0 30px rgba(0,0,0,0.4), 0 0 20px ${glowAt(40)}`,
  /** Plain inner vignette for content cards. */
  PANEL_SHADOW: 'inset 0 0 20px rgba(0,0,0,0.3)',
  /** Loading card shadow. */
  LOADING_SHADOW: `inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px ${glowAt(40)}`,
  /** Bottom banner shadow (cookie consent). */
  BANNER_SHADOW: `0 -4px 20px rgba(0,0,0,0.5), 0 0 30px ${glowAt(30)}`,
  /** Small icon tile / medallion fill. */
  TILE_BG: `linear-gradient(180deg, ${amberTint(800, 20)} 0%, ${amberTint(900, 12)} 100%)`,
  /** Secondary button fill (amber-scale, follows the theme hue). */
  BUTTON_BG: `linear-gradient(180deg, ${amberTint(700, 30)} 0%, ${amberTint(800, 20)} 100%)`,
  /** Soft radial highlight inside rings. */
  RING_GLOW: `radial-gradient(circle, transparent 40%, ${glowAt(30)} 100%)`,
  /** Full-screen overlay that hides the scene: theme surface in the middle over the solid page base. */
  OVERLAY_BG: `radial-gradient(ellipse at center, var(--surface) 0%, transparent 75%) var(--page-base)`,
  /** Modal / dialog fill for the paused overlay card. */
  DIALOG_BG: `linear-gradient(180deg, var(--surface) 0%, ${shade(25)} 40%, ${shade(45)} 100%)`,
  /** Simple two-stop modal fill. */
  MODAL_BG: `linear-gradient(180deg, var(--surface) 0%, ${shade(40)} 100%)`,
  /** Dialog shadow: highlight edge, deep drop shadow and a faint theme glow. */
  DIALOG_SHADOW: `inset 0 1px 0 ${glowAt(30)}, inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.8), 0 0 30px ${glowAt(40)}`,
  /** Paused dialog accent strips (amber-scale so they follow the theme hue). */
  STRIP_TOP: `linear-gradient(90deg, transparent 0%, ${amberTint(700, 75)} 20%, ${amberTint(400, 80)} 50%, ${amberTint(700, 75)} 80%, transparent 100%)`,
  STRIP_BOTTOM: `linear-gradient(90deg, transparent 0%, ${amberTint(900, 60)} 30%, ${amberTint(700, 75)} 50%, ${amberTint(900, 60)} 70%, transparent 100%)`,
  /** Soft halo behind a dialog. */
  HALO: `radial-gradient(ellipse, ${glowAt(45)} 0%, transparent 70%)`,
  /** Opaque page background for screens that must hide whatever is beneath them. */
  PAGE_BG: 'var(--page-bg)',
  /** Sticky panel header (settings, stats): near-flat surface, a touch more opaque than the body. */
  HEADER_BG: `linear-gradient(180deg, ${shade(10)} 0%, ${shade(25)} 100%)`,
  /** Small dark control fill: icon/close buttons, chat chips (was rgba(26,21,16,.8) -> rgba(13,11,8,.8)). */
  CONTROL_BG: `linear-gradient(180deg, ${surfaceAt(85)} 0%, ${shadeAt(50, 85)} 100%)`,
  /** Option tile / setting row fill (was rgba(26,21,16,.6) -> rgba(18,16,12,.6)). */
  CARD_BG: `linear-gradient(180deg, ${surfaceAt(65)} 0%, ${shadeAt(30, 65)} 100%)`,
  /** Subtle grouped-section fill (was rgba(26,21,16,.4) -> rgba(13,11,8,.4)). */
  CARD_BG_SOFT: `linear-gradient(180deg, ${surfaceAt(45)} 0%, ${shadeAt(50, 45)} 100%)`,
  /** Selected option tile (was rgba(139,90,43,.2) -> rgba(100,60,20,.15)). */
  SELECTED_BG: `linear-gradient(180deg, ${amberTint(700, 22)} 0%, ${amberTint(800, 15)} 100%)`,
  /** Toggle / active button fill (was rgba(180,120,60,.5) -> rgba(139,90,43,.4)). */
  ACTIVE_BG: `linear-gradient(180deg, ${amberTint(600, 50)} 0%, ${amberTint(700, 40)} 100%)`,
  /** Toggle track when off (was rgba(20,18,15,.8) -> rgba(13,11,8,.8)). */
  INACTIVE_BG: `linear-gradient(180deg, ${shadeAt(40, 85)} 0%, ${shadeAt(60, 85)} 100%)`,
  /** Soft shadow with a faint theme glow for floating popovers (emote bar, quick chat). */
  POPOVER_SHADOW: `inset 0 0 30px rgba(0,0,0,0.4), 0 0 20px ${glowAt(35)}`,
} as const;
