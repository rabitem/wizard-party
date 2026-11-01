import type { HudSkin } from '../hud-skin.types';
import { HALLOWEEN_ICONS } from './halloween-icons';
import { HalloweenButtonDecor, HalloweenPanelDecor, HalloweenRoundBadgeDecor } from './halloween-decor';

/** Halloween (haunted night) HUD skin: pumpkins, cobwebs, candles, a spider and bats. */
export const HALLOWEEN_HUD_SKIN: HudSkin = {
  icons: HALLOWEEN_ICONS,
  ButtonDecor: HalloweenButtonDecor,
  PanelDecor: HalloweenPanelDecor,
  RoundBadgeDecor: HalloweenRoundBadgeDecor,
};
