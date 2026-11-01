// Card back designs per card theme (the face-down side of every card)

/**
 * How a card back is painted on canvas.
 * - classic: the original deep blue star medallion (recoloured per deck)
 * - seasonal styles: full illustrated backs for the seasonal decks
 * - manga / hyperreal: match the stylized card face art styles
 * - neon / pixel / tarot / solarpunk: match the trend pack card face art styles
 */
export type CardBackStyle =
  | 'classic'
  | 'halloween'
  | 'autumn'
  | 'winter'
  | 'spring'
  | 'summer'
  | 'manga'
  | 'hyperreal'
  | 'neon'
  | 'pixel'
  | 'tarot'
  | 'solarpunk';

export type SeasonalCardStyle = Extract<CardBackStyle, 'halloween' | 'autumn' | 'winter' | 'spring' | 'summer'>;

export const SEASONAL_CARD_STYLES: readonly SeasonalCardStyle[] = ['halloween', 'autumn', 'winter', 'spring', 'summer'];

/**
 * Colour roles of a card back.
 * base/deep: background centre and edge, metal/metalShade: frame and medallion,
 * accent: the motif colour, glow: highlights and light, ink: silhouettes.
 */
export interface CardBackPalette {
  base: string;
  deep: string;
  metal: string;
  metalShade: string;
  accent: string;
  glow: string;
  ink: string;
}

export interface CardBackDesign {
  style: CardBackStyle;
  palette: CardBackPalette;
}

/** The original card back: deep blue with a gold star medallion */
export const DEFAULT_CARD_BACK: CardBackDesign = {
  style: 'classic',
  palette: {
    base: '#1a2a48',
    deep: '#0a1628',
    metal: '#c9a227',
    metalShade: '#8b7355',
    accent: '#c9a227',
    glow: '#f3e3a0',
    ink: '#050b14',
  },
};

/** Card back per card theme id; themes without an entry use DEFAULT_CARD_BACK */
export const CARD_BACK_DESIGNS: Record<string, CardBackDesign> = {
  fantasy: DEFAULT_CARD_BACK,
  elements: {
    style: 'classic',
    palette: { base: '#173548', deep: '#081825', metal: '#d89a48', metalShade: '#7a5a38', accent: '#d89a48', glow: '#f6d8a8', ink: '#04101a' },
  },
  classic: {
    style: 'classic',
    palette: { base: '#5a1622', deep: '#2a0810', metal: '#d4af37', metalShade: '#8a5a3a', accent: '#d4af37', glow: '#f6e2a0', ink: '#140306' },
  },
  zodiac: {
    style: 'classic',
    palette: { base: '#261c4e', deep: '#0e0a24', metal: '#c8cce0', metalShade: '#7a7f99', accent: '#c8cce0', glow: '#eef0ff', ink: '#06040f' },
  },
  nature: {
    style: 'classic',
    palette: { base: '#1e3a22', deep: '#0b1a0e', metal: '#c9a227', metalShade: '#6b7a45', accent: '#c9a227', glow: '#e8f0b0', ink: '#040a05' },
  },
  combat: {
    style: 'classic',
    palette: { base: '#3a1a1a', deep: '#160909', metal: '#b8bcc4', metalShade: '#6e5050', accent: '#b8bcc4', glow: '#eef0f4', ink: '#0a0303' },
  },
  halloween: {
    style: 'halloween',
    palette: { base: '#3d1b60', deep: '#120822', metal: '#ff8c1a', metalShade: '#7a3d0f', accent: '#ffb347', glow: '#f4ecc2', ink: '#07030d' },
  },
  autumn: {
    style: 'autumn',
    palette: { base: '#7a3a14', deep: '#2b1207', metal: '#e6b04a', metalShade: '#7a4a1a', accent: '#c4461e', glow: '#f6d08a', ink: '#1a0a04' },
  },
  winter: {
    style: 'winter',
    palette: { base: '#2c5078', deep: '#0b182b', metal: '#e2eaf4', metalShade: '#7f93a8', accent: '#a9d4f2', glow: '#ffffff', ink: '#061020' },
  },
  spring: {
    style: 'spring',
    palette: { base: '#d77fa3', deep: '#6a2c4c', metal: '#fff1dc', metalShade: '#5e9e4e', accent: '#7cc06a', glow: '#ffe4ef', ink: '#3a1a2a' },
  },
  summer: {
    style: 'summer',
    palette: { base: '#22b0b8', deep: '#0a4a5c', metal: '#f4d58a', metalShade: '#b08a4a', accent: '#ffb02e', glow: '#eafcf8', ink: '#063440' },
  },
  manga: {
    style: 'manga',
    palette: { base: '#f7f4ec', deep: '#d9d4c6', metal: '#111111', metalShade: '#3a3a3a', accent: '#e0283c', glow: '#ffffff', ink: '#111111' },
  },
  hyperreal: {
    style: 'hyperreal',
    palette: { base: '#6a3220', deep: '#1e0c06', metal: '#d9b25a', metalShade: '#7a5418', accent: '#fbe9b0', glow: '#fff6d8', ink: '#0e0503' },
  },
  neon: {
    style: 'neon',
    palette: { base: '#160a2a', deep: '#04020a', metal: '#22e5ff', metalShade: '#0e6a7a', accent: '#ff3fd2', glow: '#ffd6f6', ink: '#020106' },
  },
  pixel: {
    style: 'pixel',
    palette: { base: '#1d2f7a', deep: '#0a1030', metal: '#ffd93b', metalShade: '#b8860b', accent: '#ff4d6d', glow: '#ffffff', ink: '#05081c' },
  },
  celestial: {
    style: 'tarot',
    palette: { base: '#18204a', deep: '#05071c', metal: '#e6c46a', metalShade: '#8a6a28', accent: '#f6e2a0', glow: '#fff8e0', ink: '#020310' },
  },
  solarpunk: {
    style: 'solarpunk',
    palette: { base: '#3c6a34', deep: '#14301a', metal: '#d9b45a', metalShade: '#8a6a2a', accent: '#8fdc6a', glow: '#f2f8e0', ink: '#0a1a0c' },
  },
};

/** Back design for a card theme id; unknown or missing ids fall back to the classic blue back */
export function getCardBackDesign(themeId: string | null | undefined): CardBackDesign {
  if (!themeId) return DEFAULT_CARD_BACK;
  return CARD_BACK_DESIGNS[themeId] ?? DEFAULT_CARD_BACK;
}

/** Seasonal style of a card theme, or null for non-seasonal decks */
export function getSeasonalCardStyle(themeId: string | null | undefined): SeasonalCardStyle | null {
  const style = getCardBackDesign(themeId).style;
  return (SEASONAL_CARD_STYLES as readonly string[]).includes(style) ? (style as SeasonalCardStyle) : null;
}
