import type { HudSkin } from '../hud-skin.types';
import { PIXEL_ICONS } from './pixel-icons';
import { PixelButtonDecor, PixelPanelDecor, PixelRoundBadgeDecor } from './pixel-decor';

/** Pixel (8-bit) HUD skin: pixel-grid icons, stepped frames, coins, a blinking star, scanlines. */
export const PIXEL_HUD_SKIN: HudSkin = {
  icons: PIXEL_ICONS,
  ButtonDecor: PixelButtonDecor,
  PanelDecor: PixelPanelDecor,
  RoundBadgeDecor: PixelRoundBadgeDecor,
};
