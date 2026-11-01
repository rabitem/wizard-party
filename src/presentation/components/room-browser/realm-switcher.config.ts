// Realm switcher: the home screen's one-click look picker (Classic + seasonal and trend packs).
import { CARD_THEMES, type CardTheme } from '@/presentation/components/settings/card-theme-presets';
import { THEME_PACKS, type SeasonalThemePack } from '@/presentation/components/settings/seasonal-theme-packs';
import { THEME_PRESETS, type ThemePreset } from '@/presentation/components/settings/visual-presets';
import { DEFAULT_TABLE_THEME_ID, getTableTheme, type TableThemePalette } from '@/presentation/config/table-theme.config';

/** The original look: dark UI, casino table, fantasy heraldry. */
export const CLASSIC_REALM_PACK: SeasonalThemePack = {
  id: 'classic',
  name: 'Classic',
  tagline: 'Amber candlelight & casino felt',
  icon: 'ra-crown',
  color: 'var(--accent)',
  theme: 'dark',
  tableTheme: DEFAULT_TABLE_THEME_ID,
  cardTheme: 'fantasy',
};

/**
 * Tiny per-realm glyph; pumpkin and leaf are the animated mascots, 'pixel-heart' is an
 * inline 8-bit SVG, the rest are emoji.
 */
export type RealmGlyph =
  | { kind: 'mascot'; mascot: 'pumpkin' | 'leaf' }
  | { kind: 'emoji'; emoji: string }
  | { kind: 'pixel-heart' };

const REALM_GLYPHS: Record<string, RealmGlyph> = {
  classic: { kind: 'emoji', emoji: '\u{1F451}' }, // crown
  halloween: { kind: 'mascot', mascot: 'pumpkin' },
  autumn: { kind: 'mascot', mascot: 'leaf' },
  winter: { kind: 'emoji', emoji: '❄️' }, // snowflake
  spring: { kind: 'emoji', emoji: '\u{1F338}' }, // blossom
  summer: { kind: 'emoji', emoji: '☀️' }, // sun
  manga: { kind: 'emoji', emoji: '\u{1F4AC}' }, // speech bubble
  neon: { kind: 'emoji', emoji: '\u26A1' }, // lightning
  pixel: { kind: 'pixel-heart' },
  celestial: { kind: 'emoji', emoji: '\u{1F319}' }, // crescent moon
  solarpunk: { kind: 'emoji', emoji: '\u{1F331}' }, // sprout
};

const FALLBACK_GLYPH: RealmGlyph = { kind: 'emoji', emoji: '✨' };

export interface RealmOption {
  pack: SeasonalThemePack;
  ui: ThemePreset['colors'];
  table: TableThemePalette;
  cards: CardTheme;
  glyph: RealmGlyph;
  isNew: boolean;
}

const DEFAULT_CARD_THEME = CARD_THEMES[0];
const DEFAULT_UI_COLORS = THEME_PRESETS[0].colors;

function toRealmOption(pack: SeasonalThemePack): RealmOption {
  const themePreset = THEME_PRESETS.find((preset) => preset.id === pack.theme);
  const cards = CARD_THEMES.find((theme) => theme.id === pack.cardTheme) ?? DEFAULT_CARD_THEME;
  const table = getTableTheme(pack.tableTheme);
  return {
    pack,
    ui: themePreset?.colors ?? DEFAULT_UI_COLORS,
    table,
    cards,
    glyph: REALM_GLYPHS[pack.id] ?? FALLBACK_GLYPH,
    isNew: Boolean(themePreset?.isNew || table.isNew || cards.isNew),
  };
}

export const REALM_OPTIONS: RealmOption[] = [CLASSIC_REALM_PACK, ...THEME_PACKS].map(toRealmOption);

/** Layout + motion tuning for the switcher row. */
export const REALM_SWITCHER = {
  /** Fan angles (deg) for the preview's mini cards */
  CARD_FAN_DEGREES: [-16, 0, 16],
  ENTRANCE_DELAY_S: 0.25,
} as const;
