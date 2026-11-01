import { describe, expect, it } from 'vitest';
import { CARD_THEMES } from './card-theme-presets';
import { TABLE_THEMES, THEME_PRESETS } from './visual-presets';
import { getThemedEnvironment } from '../three/themed-environments/environment-registry';
import { getCardBackDesign } from './card-back-presets';
import {
  SEASONAL_THEME_PACKS,
  THEME_PACKS,
  TREND_THEME_PACKS,
  isSeasonalPromoRunning,
  isSeasonalThemePackActive,
  withSeasonalThemePack,
} from './seasonal-theme-packs';
import type { GameSettings } from './settings-persistence';

const baseSettings = { theme: 'dark', tableTheme: 'default', cardTheme: 'fantasy', avatar: 'wizard' } as GameSettings;

describe('seasonal theme packs', () => {
  it('should reference themes that exist in every preset list', () => {
    for (const pack of THEME_PACKS) {
      expect(THEME_PRESETS.some((t) => t.id === pack.theme)).toBe(true);
      expect(TABLE_THEMES.some((t) => t.id === pack.tableTheme)).toBe(true);
      expect(CARD_THEMES.some((t) => t.id === pack.cardTheme)).toBe(true);
    }
  });

  it('should switch theme, table and cards while keeping other settings', () => {
    const [halloween] = SEASONAL_THEME_PACKS;
    expect(halloween.id).toBe('halloween');
    const next = withSeasonalThemePack(baseSettings, halloween);
    expect(next).toMatchObject({ theme: 'halloween', tableTheme: 'halloween', cardTheme: 'halloween', avatar: 'wizard' });
    expect(isSeasonalThemePackActive(next, halloween)).toBe(true);
    expect(isSeasonalThemePackActive(baseSettings, halloween)).toBe(false);
  });

  it('should stop advertising after the promo ends', () => {
    expect(isSeasonalPromoRunning(new Date('2026-10-27T12:00:00Z'))).toBe(true);
    expect(isSeasonalPromoRunning(new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });

  it('should list seasonal packs first, then the trend packs, with unique ids', () => {
    expect(THEME_PACKS).toEqual([...SEASONAL_THEME_PACKS, ...TREND_THEME_PACKS]);
    const ids = THEME_PACKS.map((pack) => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should give every trend pack its own UI theme, table, deck, card back and 3D room', () => {
    for (const pack of TREND_THEME_PACKS) {
      expect(pack.theme).toBe(pack.id);
      expect(pack.tableTheme).toBe(pack.id);
      expect(pack.cardTheme).toBe(pack.id);
      expect(getCardBackDesign(pack.cardTheme).style).not.toBe('classic');
      expect(getThemedEnvironment(pack.tableTheme)).not.toBeNull();
    }
  });
});
