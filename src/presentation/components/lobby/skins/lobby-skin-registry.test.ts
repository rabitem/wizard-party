import { describe, expect, it } from 'vitest';
import { EMPTY_LOBBY_SKIN, getLobbySkin } from './lobby-skin-registry';

/** Themes that ship a complete lobby skin; add a theme here when its skin is complete. */
const FULL_SKINS = ['summer', 'halloween', 'winter', 'neon', 'autumn', 'spring', 'solarpunk', 'manga', 'pixel', 'celestial'];

describe('getLobbySkin', () => {
  it('should return the empty skin for undefined, null, unknown or unskinned themes', () => {
    for (const theme of [undefined, null, '', 'not-a-theme', 'toString', '__proto__', 'dark', 'light', 'forest', 'royal', 'frost']) {
      expect(getLobbySkin(theme), String(theme)).toBe(EMPTY_LOBBY_SKIN);
    }
  });

  it('should give every fully skinned theme all slots', () => {
    for (const theme of FULL_SKINS) {
      const skin = getLobbySkin(theme);
      expect(skin).not.toBe(EMPTY_LOBBY_SKIN);
      expect(skin.Scene).toBeTypeOf('function');
      expect(skin.HeaderDecor).toBeTypeOf('function');
      expect(skin.PanelBackdrop).toBeTypeOf('function');
      expect(skin.PanelDecor).toBeTypeOf('function');
      expect(skin.PlayerSlotDecor).toBeTypeOf('function');
      expect(skin.AvatarFrameDecor).toBeTypeOf('function');
      expect(skin.EmptySlotDecor).toBeTypeOf('function');
      expect(skin.AddBotDecor).toBeTypeOf('function');
      expect(skin.StartButtonDecor).toBeTypeOf('function');
      expect(skin.icons?.emblem).toBeDefined();
      expect(skin.copy?.waitingForPlayer).toBeTruthy();
    }
  });
});
