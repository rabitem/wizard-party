import { describe, expect, it } from 'vitest';

import { CARD_THEMES } from '@/presentation/components/settings/card-theme-presets';
import { HUD_CONTRAST_CONFIG } from '@/presentation/config/hud-contrast.config';
import { contrastRatio } from '@/presentation/utils/color-contrast';
import { getHudSuitColor } from './hud-suit-color';

describe('getHudSuitColor', () => {
  it('should make every card theme suit readable on the HUD panels', () => {
    for (const theme of CARD_THEMES) {
      for (const [suit, suitTheme] of Object.entries(theme.suits)) {
        const color = getHudSuitColor(suitTheme.accent);
        const ratio = contrastRatio(color, HUD_CONTRAST_CONFIG.PANEL_REFERENCE_COLOR);
        expect(ratio, `${theme.id} ${suit} (${suitTheme.accent} -> ${color})`).toBeGreaterThanOrEqual(
          HUD_CONTRAST_CONFIG.MIN_TEXT_CONTRAST,
        );
      }
    }
  });
});
