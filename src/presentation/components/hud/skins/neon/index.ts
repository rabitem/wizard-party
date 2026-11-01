import type { HudSkin } from '../hud-skin.types';
import { NEON_ICONS } from './neon-icons';
import { NeonButtonDecor, NeonPanelDecor, NeonRoundBadgeDecor } from './neon-decor';

/** Neon (synthwave) HUD skin: glowing tubes, mounting clips, a horizon grid and a palm sign. */
export const NEON_HUD_SKIN: HudSkin = {
  icons: NEON_ICONS,
  ButtonDecor: NeonButtonDecor,
  PanelDecor: NeonPanelDecor,
  RoundBadgeDecor: NeonRoundBadgeDecor,
};
