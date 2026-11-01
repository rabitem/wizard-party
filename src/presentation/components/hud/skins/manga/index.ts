import type { HudSkin } from '../hud-skin.types';
import { MANGA_ICONS } from './manga-icons';
import { MangaButtonDecor, MangaPanelDecor, MangaRoundBadgeDecor } from './manga-decor';

/** Manga (shonen ink) HUD skin: brush strokes, screentone, speed lines and a hanko seal. */
export const MANGA_HUD_SKIN: HudSkin = {
  icons: MANGA_ICONS,
  ButtonDecor: MangaButtonDecor,
  PanelDecor: MangaPanelDecor,
  RoundBadgeDecor: MangaRoundBadgeDecor,
};
