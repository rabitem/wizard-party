import { describe, expect, it } from 'vitest';
import { TABLE_THEME_PALETTES } from './table-theme.config';
import { DEFAULT_THEME_FX, THEMED_FX_IDS, getThemeFx } from './theme-fx.config';

const THEMED_IDS: readonly string[] = THEMED_FX_IDS;

describe('theme-fx config', () => {
  it.each(TABLE_THEME_PALETTES.map((palette) => palette.id))(
    'should give the %s table its own effect and surface when it is a seasonal or trend pack, else dust and felt',
    (id) => {
      const expected = THEMED_IDS.includes(id) ? { landEffect: id, surface: id } : DEFAULT_THEME_FX;
      expect(getThemeFx(id)).toEqual(expected);
    }
  );

  it('should only give effects and surfaces to packs that exist as table themes', () => {
    const paletteIds = TABLE_THEME_PALETTES.map((palette) => palette.id);
    expect(THEMED_IDS.filter((id) => !paletteIds.includes(id))).toEqual([]);
  });

  it('should keep classic tables and unknown ids on dust and felt', () => {
    expect(getThemeFx('default')).toEqual(DEFAULT_THEME_FX);
    expect(getThemeFx('ocean')).toEqual(DEFAULT_THEME_FX);
    expect(getThemeFx('nope')).toEqual(DEFAULT_THEME_FX);
    expect(getThemeFx(undefined)).toEqual(DEFAULT_THEME_FX);
  });
});
