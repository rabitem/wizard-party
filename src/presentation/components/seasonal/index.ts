/**
 * Seasonal / themed page surfaces.
 *
 * How screens should use this (for the agents converting pages):
 *
 * 1. Page background - the root layout mounts <SeasonalAmbience /> once. It paints
 *    `var(--page-bg)` as a fixed layer at z-index -1 plus a canvas of themed particles (snow,
 *    leaves, petals, fog + bats, stars, ...). So a page root should be TRANSPARENT: delete the
 *    hard-coded `radial-gradient(... #1a1610 ...)` / `#0f0d0a` / `#1a1510` backgrounds instead of
 *    replacing them. If a page root must paint (e.g. a loading screen that has to hide whatever
 *    is underneath), use `style={{ background: 'var(--page-bg)' }}` - it then covers the particles.
 *    Do not add `position` + `z-index` stacking contexts to page roots that should show particles
 *    unless their background is transparent.
 *
 * 2. Panels, cards, modals, sheets - `background: var(--surface)` (translucent) and
 *    `border: 1px solid var(--surface-border)`. Tailwind: `bg-[var(--surface)]`,
 *    `border-[var(--surface-border)]`. Pair with `backdrop-blur-sm` only on few large panels.
 *
 * 3. Accent glow - `var(--glow)` for box-shadow / text-shadow / radial highlights, e.g.
 *    `shadow-[0_0_24px_var(--glow)]` or `textShadow: '0 0 12px var(--glow)'`.
 *
 * 4. Text keeps using the amber scale (text-amber-200 etc.), which theme-palettes.css remaps per
 *    theme. Every theme's surfaces are dark enough for it (Light is a warm sepia, not white).
 *
 * 5. Ornaments - <SeasonalCorner position="top-left" | "top-right" | ... size={40} /> inside a
 *    `relative` card adds a flourish with the theme emblem (pumpkin, maple leaf, snowflake,
 *    blossom, sun; a star otherwise). <SeasonalDivider /> is a fading rule with the emblem in the
 *    middle - use it between sections/headings. useActiveTheme() returns the current UI theme id
 *    when a screen needs theme-specific copy or art.
 *
 * The variables are defined per theme in src/app/theme-palettes.css; particle packs live in
 * src/presentation/config/seasonal-ambience(-packs).config.ts, the engine in ./ambience/.
 */
export { SeasonalAmbience } from './SeasonalAmbience';
export { SeasonalCorner } from './SeasonalCorner';
export { SeasonalDivider } from './SeasonalDivider';
export { SeasonalEmblem } from './SeasonalEmblem';
export { SeasonalGlyph } from './seasonal-glyphs';
export { useActiveTheme } from './useActiveTheme';
