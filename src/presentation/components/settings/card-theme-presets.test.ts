import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CARD_THEMES } from './card-theme-presets';

/** The icon font the HUD and trump picker draw suit symbols with (imported by src/app/layout.tsx) */
const ICON_CSS = readFileSync(fileURLToPath(new URL('../../../styles/rpg-awesome.css', import.meta.url)), 'utf8');

const SUITS = CARD_THEMES.flatMap((theme) =>
  Object.entries(theme.suits).map(([suitKey, suit]) => ({ themeId: theme.id, suitKey, symbol: suit.symbol }))
);

describe('CARD_THEMES', () => {
  it.each(SUITS)('$themeId $suitKey suit icon $symbol exists in the bundled icon font', ({ symbol }) => {
    expect(ICON_CSS).toContain(`.${symbol}:before`);
  });
});
