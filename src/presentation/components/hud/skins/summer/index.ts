import type { HudSkin } from '../hud-skin.types';
import { SUMMER_ICONS } from './summer-icons';
import { SummerButtonDecor, SummerPanelDecor, SummerRoundBadgeDecor } from './summer-decor';

/** Summer (pool/beach) HUD skin - the reference skin for the registry. */
export const SUMMER_HUD_SKIN: HudSkin = {
  icons: SUMMER_ICONS,
  ButtonDecor: SummerButtonDecor,
  PanelDecor: SummerPanelDecor,
  RoundBadgeDecor: SummerRoundBadgeDecor,
};
