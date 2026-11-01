// Realm switcher: the home screen's one-click look picker (Classic + seasonal and trend packs).
import { Crown, Flower2, MessageCircle, Moon, Snowflake, Sparkles, Sprout, Sun, Zap, type LucideIcon } from 'lucide-react';
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
 * inline 8-bit SVG, the rest are line icons from the app's icon set.
 */
export type RealmGlyph =
  | { kind: 'mascot'; mascot: 'pumpkin' | 'leaf' }
  | { kind: 'icon'; icon: LucideIcon }
  | { kind: 'pixel-heart' };

const REALM_GLYPHS: Record<string, RealmGlyph> = {
  classic: { kind: 'icon', icon: Crown },
  halloween: { kind: 'mascot', mascot: 'pumpkin' },
  autumn: { kind: 'mascot', mascot: 'leaf' },
  winter: { kind: 'icon', icon: Snowflake },
  spring: { kind: 'icon', icon: Flower2 },
  summer: { kind: 'icon', icon: Sun },
  manga: { kind: 'icon', icon: MessageCircle },
  neon: { kind: 'icon', icon: Zap },
  pixel: { kind: 'pixel-heart' },
  celestial: { kind: 'icon', icon: Moon },
  solarpunk: { kind: 'icon', icon: Sprout },
};

const FALLBACK_GLYPH: RealmGlyph = { kind: 'icon', icon: Sparkles };

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
