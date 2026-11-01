import { describe, expect, it } from 'vitest';
import { EMPTY_HUD_SKIN, getHudSkin } from './hud-skin-registry';

describe('getHudSkin', () => {
  it('should return the empty skin for undefined, null or unknown themes', () => {
    expect(getHudSkin(undefined)).toBe(EMPTY_HUD_SKIN);
    expect(getHudSkin(null)).toBe(EMPTY_HUD_SKIN);
    expect(getHudSkin('')).toBe(EMPTY_HUD_SKIN);
    expect(getHudSkin('not-a-theme')).toBe(EMPTY_HUD_SKIN);
    expect(getHudSkin('toString')).toBe(EMPTY_HUD_SKIN);
  });

  it('should give every seasonal and trend theme a full skin', () => {
    for (const theme of ['halloween', 'autumn', 'winter', 'spring', 'summer', 'manga', 'neon', 'pixel', 'celestial', 'solarpunk']) {
      const skin = getHudSkin(theme);
      expect(skin.icons?.shuffle, theme).toBeTypeOf('function');
      expect(skin.ButtonDecor, theme).toBeTypeOf('function');
      expect(skin.PanelDecor, theme).toBeTypeOf('function');
      expect(skin.RoundBadgeDecor, theme).toBeTypeOf('function');
    }
  });
});
