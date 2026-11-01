import { HUD_CONTRAST_CONFIG } from '@/presentation/config/hud-contrast.config';
import { ensureContrastOnDark } from '@/presentation/utils/color-contrast';

const cache = new Map<string, string>();

/**
 * HUD text colour for a suit accent: the accent itself when it is readable on every HUD panel,
 * otherwise its lightest-needed tint that reaches WCAG AA. Use it for suit names and icons in
 * the HUD; card faces keep the raw accent.
 */
export function getHudSuitColor(accent: string): string {
  const cached = cache.get(accent);
  if (cached) return cached;
  const readable = ensureContrastOnDark(
    accent,
    HUD_CONTRAST_CONFIG.PANEL_REFERENCE_COLOR,
    HUD_CONTRAST_CONFIG.MIN_TEXT_CONTRAST,
  );
  cache.set(accent, readable);
  return readable;
}
