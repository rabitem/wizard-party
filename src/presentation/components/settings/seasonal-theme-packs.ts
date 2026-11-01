// Seasonal theme packs bundle a visual theme, table and card heraldry
// so players can switch the whole look with one click.
import { CONSTANTS } from '@/presentation/config/constants';
import { loadGameSettings, saveGameSettings, type GameSettings, type ThemePreference } from './settings-persistence';
import { TREND_THEME_PACKS } from './trend-theme-packs';

export interface SeasonalThemePack {
  id: string;
  name: string;
  tagline: string;
  icon: string; // RPG-Awesome icon class
  /** Primary color for the pack's promo button */
  color: string;
  theme: ThemePreference;
  tableTheme: string;
  cardTheme: string;
}

export const SEASONAL_THEME_PACKS: SeasonalThemePack[] = [
  {
    id: 'halloween',
    name: 'Halloween',
    tagline: 'Haunted manor, graves, spirits & skulls',
    icon: 'ra-death-skull',
    color: '#ff7a1a',
    theme: 'halloween',
    tableTheme: 'halloween',
    cardTheme: 'halloween',
  },
  {
    id: 'autumn',
    name: 'Autumn',
    tagline: 'Russet felt, falling leaves & harvest moon',
    icon: 'ra-zigzag-leaf',
    color: '#d9752b',
    theme: 'autumn',
    tableTheme: 'autumn',
    cardTheme: 'autumn',
  },
  {
    id: 'winter',
    name: 'Winter',
    tagline: 'Frozen hall, snowy silver & hearth glow',
    icon: 'ra-snowflake',
    color: '#c2410c',
    theme: 'winter',
    tableTheme: 'winter',
    cardTheme: 'winter',
  },
  {
    id: 'spring',
    name: 'Spring',
    tagline: 'Blossom garden, sprouts & clover',
    icon: 'ra-flower',
    color: '#e58bb0',
    theme: 'spring',
    tableTheme: 'spring',
    cardTheme: 'spring',
  },
  {
    id: 'summer',
    name: 'Summer',
    tagline: 'Sunlit terrace, tides & meadows',
    icon: 'ra-sun',
    color: '#22b8b0',
    theme: 'summer',
    tableTheme: 'summer',
    cardTheme: 'summer',
  },
];

/** Any one-click look (seasonal or trend); same shape as a seasonal pack. */
export type ThemePack = SeasonalThemePack;

export { TREND_THEME_PACKS };

/** Every one-click look: the seasonal packs followed by the year-round trend packs. */
export const THEME_PACKS: ThemePack[] = [...SEASONAL_THEME_PACKS, ...TREND_THEME_PACKS];

export function withSeasonalThemePack(settings: GameSettings, pack: SeasonalThemePack): GameSettings {
  return { ...settings, theme: pack.theme, tableTheme: pack.tableTheme, cardTheme: pack.cardTheme };
}

export function applySeasonalThemePack(pack: SeasonalThemePack): GameSettings {
  return saveGameSettings(withSeasonalThemePack(loadGameSettings(), pack));
}

export function isSeasonalThemePackActive(settings: GameSettings, pack: SeasonalThemePack): boolean {
  return settings.theme === pack.theme && settings.tableTheme === pack.tableTheme && settings.cardTheme === pack.cardTheme;
}

/** Whether the seasonal themes promo should still be advertised on the given date. */
export function isSeasonalPromoRunning(now: Date = new Date()): boolean {
  return now.getTime() < Date.parse(CONSTANTS.SEASONAL_PROMO.ENDS_AT);
}
