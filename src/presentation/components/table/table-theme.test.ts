import { describe, expect, it } from 'vitest';

import { DEFAULT_TABLE_THEME_ID, TABLE_THEME_PALETTES, getTableTheme } from './table-theme';

describe('table theme lookup', () => {
  it('keeps the stored default theme id', () => {
    // Players' saved settings hold this id
    expect(DEFAULT_TABLE_THEME_ID).toBe('default');
  });

  it.each(TABLE_THEME_PALETTES)('resolves stored id $id to its own palette', (palette) => {
    expect(getTableTheme(palette.id).id).toBe(palette.id);
  });

  it('falls back to the default table theme for unknown ids', () => {
    expect(getTableTheme('missing')).toEqual(getTableTheme(DEFAULT_TABLE_THEME_ID));
  });
});
