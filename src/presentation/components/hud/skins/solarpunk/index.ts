import type { HudSkin } from '../hud-skin.types';
import { SOLARPUNK_ICONS } from './solarpunk-icons';
import { SolarpunkButtonDecor, SolarpunkPanelDecor, SolarpunkRoundBadgeDecor } from './solarpunk-decor';

/** Solarpunk (greenhouse, brass and solar glass) HUD skin. */
export const SOLARPUNK_HUD_SKIN: HudSkin = {
  icons: SOLARPUNK_ICONS,
  ButtonDecor: SolarpunkButtonDecor,
  PanelDecor: SolarpunkPanelDecor,
  RoundBadgeDecor: SolarpunkRoundBadgeDecor,
};
