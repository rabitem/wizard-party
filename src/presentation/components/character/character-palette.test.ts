import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTER_PARTS, DEFAULT_APPEARANCE } from '@shared/domain/character';

import { CLOTHING_CELLS, PALETTE_COLORS } from '@/presentation/config/character-palettes.config';
import { cellIndex, paletteRoles } from './character-palette';
import { portraitKey } from './character-portrait-renderer';

/** Materials with a texture atlas; familiars are vertex-coloured and never recoloured. */
function glbTexturedMaterialNames(): string[] {
  const bytes = readFileSync(new URL('../../../../public/characters/characters.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as {
    materials: { name: string; pbrMetallicRoughness?: { baseColorTexture?: unknown } }[];
  };
  return json.materials.filter((material) => material.pbrMetallicRoughness?.baseColorTexture).map((material) => material.name);
}

describe('character palettes', () => {
  it('should define colours for exactly the catalog palettes', () => {
    const catalog = CHARACTER_PARTS.filter((part) => part.slot === 'palette').map((part) => part.id).sort();
    expect(Object.keys(PALETTE_COLORS).sort()).toEqual(catalog);
  });

  it('should know the clothing cells of every texture in characters.glb, and only those', () => {
    expect(Object.keys(CLOTHING_CELLS).sort()).toEqual(glbTexturedMaterialNames().sort());
  });

  it('should never give a cell two roles', () => {
    for (const cells of Object.values(CLOTHING_CELLS)) {
      expect(cells.primary.filter((cell) => cells.accent.includes(cell))).toEqual([]);
    }
  });

  it('should index cells row by row from the top of the atlas', () => {
    expect([cellIndex('r0c0'), cellIndex('r1c2'), cellIndex('r3c7')]).toEqual([0, 10, 31]);
    expect(() => cellIndex('r9')).toThrow();
  });

  it('should recolour only the clothing cells, and nothing for the classic palette or unknown textures', () => {
    const roles = paletteRoles('mage_texture', 'palette:ember');
    expect([roles[cellIndex('r1c0')], roles[cellIndex('r1c2')], roles[cellIndex('r0c0')]]).toEqual([1, 2, 0]);
    expect(paletteRoles('mage_texture', 'palette:classic').every((role) => role === 0)).toBe(true);
    expect(paletteRoles('unknown_texture', 'palette:ember').every((role) => role === 0)).toBe(true);
  });
});

describe('portraitKey', () => {
  it('should change with any slot, palette included, and not with object identity', () => {
    expect(portraitKey({ ...DEFAULT_APPEARANCE })).toBe(portraitKey(DEFAULT_APPEARANCE));
    expect(portraitKey({ ...DEFAULT_APPEARANCE, palette: 'palette:ember' })).not.toBe(portraitKey(DEFAULT_APPEARANCE));
  });
});
