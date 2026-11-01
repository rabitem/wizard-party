import type { HudSkin } from '../hud-skin.types';
import { CELESTIAL_ICONS } from './celestial-icons';
import { CelestialButtonDecor, CelestialPanelDecor, CelestialRoundBadgeDecor } from './celestial-decor';

/** Celestial (night sky, gilded astronomy) HUD skin. */
export const CELESTIAL_HUD_SKIN: HudSkin = {
  icons: CELESTIAL_ICONS,
  ButtonDecor: CelestialButtonDecor,
  PanelDecor: CelestialPanelDecor,
  RoundBadgeDecor: CelestialRoundBadgeDecor,
};
