/**
 * Character palettes. The KayKit textures are 8x4 grids of gradient cells (`r<row>c<column>`,
 * row 0 at the top); parts pick a colour by sampling a cell. A palette recolours the clothing
 * cells of each texture in the shader (character-palette.ts) and leaves skin, hair, leather and
 * metal alone. Brightness relative to the cell's average is kept, so the gradients survive.
 */

export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 4;

export interface PaletteColors {
  /** Main clothing: robes, tunics, the hood. */
  primary: string;
  /** Capes and trims. */
  accent: string;
}

/** Keyed by catalog palette id; `null` keeps the original KayKit colours. */
export const PALETTE_COLORS: Readonly<Record<string, PaletteColors | null>> = {
  'palette:classic': null,
  'palette:forest': { primary: '#2f7d4a', accent: '#c9a227' },
  'palette:shadow': { primary: '#3a3446', accent: '#8b1e3f' },
  'palette:ember': { primary: '#b7411c', accent: '#f0a020' },
  'palette:frost': { primary: '#5d9cc9', accent: '#e8f4ff' },
  'palette:gold': { primary: '#c99a2e', accent: '#fff1b0' },
  'palette:arcane': { primary: '#6a2fbf', accent: '#2fd6c9' },
  'palette:oracle': { primary: '#1f6f8b', accent: '#f2d16b' },
  'palette:royal': { primary: '#22337a', accent: '#d4af37' },
};

/** Editor swatch of the classic palette, which keeps the textures: the mage robe and cape. */
export const CLASSIC_PALETTE_SWATCH: PaletteColors = { primary: '#4b3f8f', accent: '#b0204f' };

export interface ClothingCells {
  primary: readonly string[];
  accent: readonly string[];
}

/**
 * Clothing cells per texture (glTF material name in characters.glb), found by measuring which cells
 * each part's UVs sample. The knight is mostly metal: only its red cloth and gold trim change.
 */
export const CLOTHING_CELLS: Readonly<Record<string, ClothingCells>> = {
  mage_texture: { primary: ['r1c0', 'r1c1'], accent: ['r1c2', 'r2c1'] },
  knight_texture: { primary: ['r1c0', 'r2c2'], accent: ['r1c4'] },
  barbarian_texture: { primary: ['r1c0', 'r1c1', 'r2c2'], accent: [] },
  rogue_texture: { primary: ['r1c0', 'r1c1', 'r2c1'], accent: [] },
};
