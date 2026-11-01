import type { HudSkin } from '../hud-skin.types';
import { AUTUMN_ICONS } from './autumn-icons';
import { AutumnButtonDecor, AutumnPanelDecor, AutumnRoundBadgeDecor } from './autumn-decor';

/** Autumn (harvest forest) HUD skin: maple and oak leaves, acorns, wheat and weathered wood. */
export const AUTUMN_HUD_SKIN: HudSkin = {
  icons: AUTUMN_ICONS,
  ButtonDecor: AutumnButtonDecor,
  PanelDecor: AutumnPanelDecor,
  RoundBadgeDecor: AutumnRoundBadgeDecor,
};
