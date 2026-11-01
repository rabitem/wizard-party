/**
 * LOBBY skin registry: theme-specific scenes and objects in the game lobby (header vignette,
 * panels, player seats, empty seats, add-bot row, start button, a few flavour lines).
 *
 * Colours already follow the theme through CSS vars (--surface, --surface-border, --glow, the
 * remapped amber scale) and the global SeasonalAmbience paints particles behind the page. A
 * lobby skin adds the PLACE: a summer skin turns the seats into beach towels with deck chairs, a
 * halloween skin into headstones. Themes without a skin render exactly as before: every helper
 * renders nothing / its fallback children.
 *
 * How to add a skin for a theme (e.g. `autumn`):
 * 1. Create `lobby/skins/autumn/` with
 *    - `autumn-lobby-scene.tsx`: the header vignette (an SVG with
 *      `preserveAspectRatio="xMidYMax slice"`, focal art at the left/right, see `Scene` on
 *      LobbySkin) plus an optional HeaderDecor.
 *    - `autumn-lobby-panels.tsx`: PanelBackdrop / PanelDecor / AddBotDecor / StartButtonDecor.
 *    - `autumn-lobby-seats.tsx`: PlayerSlotDecor / AvatarFrameDecor / EmptySlotDecor.
 *    - `autumn-lobby.module.css` for patterns + keyframes (animations only inside
 *      `@media (prefers-reduced-motion: no-preference)`).
 *    - `index.ts` exporting `export const AUTUMN_LOBBY_SKIN: LobbySkin = { ... }`. Reuse the
 *      HUD skin's palette and icons (`@/presentation/components/hud/skins/autumn/...`), e.g.
 *      `icons: { host: AUTUMN_ICONS.trophy }`; do not edit the HUD skin files.
 *    Read the decor contract on `LobbySkin` in ./lobby-skin.types.ts first. Every slot is
 *    optional, so a skin can start with just a Scene and grow.
 * 2. Add ONE line to LOBBY_SKINS below: `autumn: AUTUMN_LOBBY_SKIN,` (and its import).
 * 3. Add the theme to the "full skins" list in lobby-skin-registry.test.ts.
 * Nothing else changes: the lobby already renders every slot. ./summer/ is the reference skin.
 */
import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import type { LobbySkin } from './lobby-skin.types';
import { AUTUMN_LOBBY_SKIN } from './autumn';
import { CELESTIAL_LOBBY_SKIN } from './celestial';
import { HALLOWEEN_LOBBY_SKIN } from './halloween';
import { MANGA_LOBBY_SKIN } from './manga';
import { NEON_LOBBY_SKIN } from './neon';
import { PIXEL_LOBBY_SKIN } from './pixel';
import { SOLARPUNK_LOBBY_SKIN } from './solarpunk';
import { SPRING_LOBBY_SKIN } from './spring';
import { SUMMER_LOBBY_SKIN } from './summer';
import { WINTER_LOBBY_SKIN } from './winter';

/** The skin used when a theme has none: every slot falls back to the default lobby. */
export const EMPTY_LOBBY_SKIN: LobbySkin = Object.freeze({});

const LOBBY_SKINS: Partial<Record<ThemePreference, LobbySkin>> = {
  autumn: AUTUMN_LOBBY_SKIN,
  celestial: CELESTIAL_LOBBY_SKIN,
  halloween: HALLOWEEN_LOBBY_SKIN,
  manga: MANGA_LOBBY_SKIN,
  neon: NEON_LOBBY_SKIN,
  pixel: PIXEL_LOBBY_SKIN,
  solarpunk: SOLARPUNK_LOBBY_SKIN,
  spring: SPRING_LOBBY_SKIN,
  summer: SUMMER_LOBBY_SKIN,
  winter: WINTER_LOBBY_SKIN,
};

/** The skin for a theme id; unknown/undefined ids get EMPTY_LOBBY_SKIN. */
export function getLobbySkin(theme: string | null | undefined): LobbySkin {
  if (!theme || !Object.prototype.hasOwnProperty.call(LOBBY_SKINS, theme)) return EMPTY_LOBBY_SKIN;
  return LOBBY_SKINS[theme as ThemePreference] ?? EMPTY_LOBBY_SKIN;
}
