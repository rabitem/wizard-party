/*
 * Theme-aware backgrounds for the account and public profile screens. They are built from the
 * per-theme variables in src/app/theme-palettes.css (--page-base, --surface, --surface-border,
 * --glow), so every UI theme restyles these screens while Dark keeps its original look.
 */

/** Large panels: the theme surface with a faint top-light / bottom-shade sheen. */
export const PANEL_BG = 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-100) 3%, transparent) 0%, rgba(0,0,0,0.12) 100%), var(--surface)';

/** Soft drop shadow plus a hairline highlight along the panel's top edge. */
export const PANEL_SHADOW = '0 4px 40px rgba(0,0,0,0.45), inset 0 1px 0 color-mix(in srgb, var(--glow) 25%, transparent)';

/** Tiles and rows nested inside a panel: a darker well tinted with the theme's base color. */
export const INSET_BG = 'color-mix(in srgb, var(--page-base) 50%, transparent)';

/** Highlighted nested tiles (unlocked achievements, stat tiles): a gentle theme-tinted gradient. */
export const INSET_RAISED_BG =
  'linear-gradient(180deg, color-mix(in srgb, var(--surface) 70%, transparent) 0%, color-mix(in srgb, var(--page-base) 60%, transparent) 100%)';

/** Inputs: a deep well so typed text stays readable on every theme. */
export const FIELD_BG = 'color-mix(in srgb, var(--page-base) 65%, transparent)';

/** Sticky header bar and floating pills (account button). */
export const BAR_BG = 'color-mix(in srgb, var(--page-base) 78%, transparent)';

/** Opaque surface for toasts that float over the 3D table. */
export const TOAST_BG = 'linear-gradient(180deg, var(--surface) 0%, var(--page-base) 100%), var(--page-base)';

/** Achievement and reward icon tiles. */
export const ICON_TILE_BG = 'linear-gradient(180deg, var(--surface) 0%, var(--page-base) 100%)';

/** Avatar face behind the preset icon. */
export const AVATAR_FACE_BG = 'radial-gradient(circle at 30% 30%, var(--surface-border), var(--surface))';

/** Level seals pinned to avatars. */
export const SEAL_BG = 'linear-gradient(180deg, var(--surface-border) 0%, transparent 100%), var(--page-base)';

/** Theme glow around headers and avatars. */
export const GLOW_SHADOW = '0 0 24px color-mix(in srgb, var(--glow) 60%, transparent)';

/** Radial theme highlight behind a header card's top edge. */
export const HEADER_HIGHLIGHT = 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--glow) 45%, transparent) 0%, transparent 60%)';

/** Headline text glow (text-shadow). */
export const TITLE_GLOW = '0 0 18px color-mix(in srgb, var(--glow) 55%, transparent)';

/** Size of the seasonal ornaments on header cards, in px. */
export const HEADER_CORNER_SIZE = 44;
