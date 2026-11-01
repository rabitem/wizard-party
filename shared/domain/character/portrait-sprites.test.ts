import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CHARACTER_PARTS,
  DEFAULT_APPEARANCE,
  PORTRAIT_SPRITE_DIR,
  SILHOUETTE_SPRITE_FILE,
  portraitSpriteFile,
  portraitSpritePath,
  portraitSprites,
  validateAppearance,
  withPart,
  type CharacterAppearance,
} from './index';

/** The committed sprites (public/ + PORTRAIT_SPRITE_DIR), resolved from this file. */
const committed = new Set(readdirSync(new URL(`../../../public${PORTRAIT_SPRITE_DIR}/`, import.meta.url)));

/** Every valid look that differs in a slot a sprite shows or ignores: each part tried on each starting look. */
function everyLook(): CharacterAppearance[] {
  const looks: CharacterAppearance[] = [];
  for (const base of portraitSprites().map((sprite) => sprite.appearance)) {
    for (const part of CHARACTER_PARTS) looks.push(withPart(base, part.id));
  }
  return looks;
}

describe('portrait sprites', () => {
  it('should commit exactly the listed sprites and the silhouette', () => {
    const listed = [...portraitSprites().map((sprite) => sprite.file), SILHOUETTE_SPRITE_FILE].sort();
    expect(new Set(listed).size).toBe(listed.length);
    expect([...committed].sort()).toEqual(listed);
  });

  it('should render only valid looks, each under the file its look maps to', () => {
    for (const sprite of portraitSprites()) {
      expect(validateAppearance(sprite.appearance)).toBeNull();
      expect(portraitSpriteFile(sprite.appearance)).toBe(sprite.file);
    }
  });

  it('should map every valid look in the catalog to a committed sprite', () => {
    const looks = everyLook();
    expect(looks.every((look) => validateAppearance(look) === null)).toBe(true);
    const missing = looks.map(portraitSpriteFile).filter((file) => !committed.has(file));
    expect([...new Set(missing)]).toEqual([]);
  });

  it('should draw a hood bare and fall back to the default part for an unknown or misplaced id', () => {
    const hooded = { ...DEFAULT_APPEARANCE, head: 'head:rogue-hooded', headwear: 'headwear:knight-helmet', palette: 'palette:frost' };
    expect(portraitSpriteFile(hooded)).toBe('rogue-hooded_none_frost.png');
    expect(portraitSpriteFile({ ...DEFAULT_APPEARANCE, head: 'head:retired', headwear: 'palette:gold', palette: 'palette:unknown' })).toBe('mage_mage-hat_classic.png');
  });

  it('should give the silhouette to a player without a look, as a path on the site', () => {
    expect(portraitSpritePath(null)).toBe(`${PORTRAIT_SPRITE_DIR}/${SILHOUETTE_SPRITE_FILE}`);
    expect(portraitSpritePath(DEFAULT_APPEARANCE)).toBe('/characters/portraits/mage_mage-hat_classic.png');
  });
});
