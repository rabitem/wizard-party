/**
 * HUD skin registry: theme-specific objects and details on the in-game HUD (icon buttons,
 * standings panel, bid picker, status bar with the round counter, chat/emote panels).
 *
 * Colours already follow the theme through CSS vars (--surface, --surface-border, --glow and the
 * remapped amber scale). A skin adds the OBJECTS: replacement icons, button rims, panel edges,
 * corner ornaments, a ring around the round counter. Themes without a skin render exactly as
 * before (every helper falls back to the lucide icon / renders nothing).
 *
 * How to add a skin for a theme (e.g. `winter`):
 * 1. Create `hud/skins/winter/` with
 *    - `winter-icons.tsx`: SVG icon components ({ className }) for any HudIconId you want to
 *      replace. Use `viewBox="0 0 24 24"`, width/height 24 attributes, no ids (no
 *      gradients/clipPaths - several copies render at once), strokes >= 0.8 so they stay crisp
 *      at 16-20px.
 *    - `winter-decor.tsx`: optional ButtonDecor / PanelDecor / RoundBadgeDecor components; read
 *      the decor contract on `HudSkin` in ./hud-skin.types.ts.
 *    - `winter.module.css` for patterns/keyframes (animations only inside
 *      `@media (prefers-reduced-motion: no-preference)`), plus a palette file for colours.
 *    - `index.ts` exporting `export const WINTER_HUD_SKIN: HudSkin = { icons: {...}, ... }`.
 * 2. Add ONE line to HUD_SKINS below: `winter: WINTER_HUD_SKIN,` (and its import).
 * 3. Optionally extend hud-skin-registry.test.ts with an assertion for the new theme.
 * Nothing else changes: hosts already render <HudIcon>, <HudButtonDecor>, <HudPanelDecor> and
 * <HudRoundBadgeDecor>. ./summer/ is the reference implementation.
 */
import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import type { HudSkin } from './hud-skin.types';
import { AUTUMN_HUD_SKIN } from './autumn';
import { CELESTIAL_HUD_SKIN } from './celestial';
import { HALLOWEEN_HUD_SKIN } from './halloween';
import { MANGA_HUD_SKIN } from './manga';
import { NEON_HUD_SKIN } from './neon';
import { PIXEL_HUD_SKIN } from './pixel';
import { SOLARPUNK_HUD_SKIN } from './solarpunk';
import { SPRING_HUD_SKIN } from './spring';
import { SUMMER_HUD_SKIN } from './summer';
import { WINTER_HUD_SKIN } from './winter';

/** The skin used when a theme has none: every slot falls back to the default HUD. */
export const EMPTY_HUD_SKIN: HudSkin = Object.freeze({});

const HUD_SKINS: Partial<Record<ThemePreference, HudSkin>> = {
  autumn: AUTUMN_HUD_SKIN,
  celestial: CELESTIAL_HUD_SKIN,
  halloween: HALLOWEEN_HUD_SKIN,
  manga: MANGA_HUD_SKIN,
  neon: NEON_HUD_SKIN,
  pixel: PIXEL_HUD_SKIN,
  solarpunk: SOLARPUNK_HUD_SKIN,
  spring: SPRING_HUD_SKIN,
  summer: SUMMER_HUD_SKIN,
  winter: WINTER_HUD_SKIN,
};

/** The skin for a theme id; unknown/undefined ids get EMPTY_HUD_SKIN. */
export function getHudSkin(theme: string | null | undefined): HudSkin {
  if (!theme || !Object.prototype.hasOwnProperty.call(HUD_SKINS, theme)) return EMPTY_HUD_SKIN;
  return HUD_SKINS[theme as ThemePreference] ?? EMPTY_HUD_SKIN;
}
