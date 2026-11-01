import type { HudSkin } from '../hud-skin.types';
import { SPRING_ICONS } from './spring-icons';
import { SpringButtonDecor, SpringPanelDecor, SpringRoundBadgeDecor } from './spring-decor';

/** Spring (cherry blossom garden) HUD skin. */
export const SPRING_HUD_SKIN: HudSkin = {
  icons: SPRING_ICONS,
  ButtonDecor: SpringButtonDecor,
  PanelDecor: SpringPanelDecor,
  RoundBadgeDecor: SpringRoundBadgeDecor,
};
