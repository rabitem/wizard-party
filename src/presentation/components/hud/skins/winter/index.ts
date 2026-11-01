import type { HudSkin } from '../hud-skin.types';
import { WINTER_ICONS } from './winter-icons';
import { WinterButtonDecor, WinterPanelDecor, WinterRoundBadgeDecor } from './winter-decor';

/** Winter (snowy holidays) HUD skin: snow caps, icicles, snowflakes, baubles and fir. */
export const WINTER_HUD_SKIN: HudSkin = {
  icons: WINTER_ICONS,
  ButtonDecor: WinterButtonDecor,
  PanelDecor: WinterPanelDecor,
  RoundBadgeDecor: WinterRoundBadgeDecor,
};
