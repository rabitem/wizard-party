/**
 * Contrast guard for theme colours reused as HUD text (e.g. the trump suit's accent).
 *
 * Card-theme accents are designed for light card faces; on the dark HUD panels some fall below
 * WCAG AA. HUD text derives a contrast-checked tint instead; the raw accent stays for card art.
 */
export const HUD_CONTRAST_CONFIG = {
  /**
   * Lightest HUD panel surface across all page themes (Light theme `--surface`, theme-palettes.css).
   * A colour readable on it is readable on every darker panel.
   */
  PANEL_REFERENCE_COLOR: '#3e3021',
  /** WCAG 2.x AA for normal-size text */
  MIN_TEXT_CONTRAST: 4.5,
} as const;
