import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CARD_THEMES, type CardArtStyle, type CardTheme, type SuitTheme } from './card-theme-presets';

/** The icon font the HUD and trump picker draw suit symbols with (imported by src/app/layout.tsx) */
const ICON_CSS = readFileSync(fileURLToPath(new URL('../../../styles/rpg-awesome.css', import.meta.url)), 'utf8');

const SUITS = CARD_THEMES.flatMap((theme) =>
  Object.entries(theme.suits).map(([suitKey, suit]) => ({ themeId: theme.id, suitKey, symbol: suit.symbol }))
);

/**
 * Smallest OKLab distance two suits of one deck may have. Below about 0.12 two dark suits read as
 * the same colour across the table (the old Combat Hammer and Sword browns were 0.05).
 */
const MIN_SUIT_COLOR_DISTANCE = 0.12;

/** Art styles that paint the card body in the suit's primary colour; the others share one body */
const SUIT_COLORED_BODY: ReadonlySet<CardArtStyle> = new Set(['classic', 'hyperreal', 'pixel']);

function linearChannel(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function toOklab(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(linearChannel);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Every suit pair of a deck with the distance between their colours in one role */
function suitPairDistances(theme: CardTheme, role: keyof Pick<SuitTheme, 'primary' | 'accent'>) {
  const suits = Object.values(theme.suits);
  return suits.flatMap((suit, i) =>
    suits.slice(i + 1).map((other) => ({
      pair: `${theme.id} ${suit.name}/${other.name} ${role} (${suit[role]} vs ${other[role]})`,
      distance: colorDistance(suit[role], other[role]),
    }))
  );
}

describe('CARD_THEMES', () => {
  it.each(SUITS)('$themeId $suitKey suit icon $symbol exists in the bundled icon font', ({ symbol }) => {
    expect(ICON_CSS).toContain(`.${symbol}:before`);
  });

  it.each(CARD_THEMES)('$id suits have clearly different signature colours', (theme) => {
    // The accent colours the suit glyph, the HUD trump chip, the table emblem and its glow
    const pairs = suitPairDistances(theme, 'accent');
    if (SUIT_COLORED_BODY.has(theme.artStyle ?? 'classic')) pairs.push(...suitPairDistances(theme, 'primary'));
    for (const { pair, distance } of pairs) {
      expect(distance, pair).toBeGreaterThanOrEqual(MIN_SUIT_COLOR_DISTANCE);
    }
  });
});
