import { Color, type Material, type MeshStandardMaterial, type Object3D, type Texture } from 'three';

import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  CLOTHING_CELLS,
  PALETTE_COLORS,
} from '@/presentation/config/character-palettes.config';

const CELL_COUNT = ATLAS_COLUMNS * ATLAS_ROWS;
const ROLE_NONE = 0;
const ROLE_PRIMARY = 1;
const ROLE_ACCENT = 2;
/** Rec. 709 luma in linear light, the space the shader works in. */
const LUMA = [0.2126, 0.7152, 0.0722] as const;

/** `r1c2` -> 10: row-major index into the 8x4 atlas, row 0 at the top (glTF UVs). */
export function cellIndex(cell: string): number {
  const match = /^r(\d)c(\d)$/.exec(cell);
  if (!match) throw new Error(`not an atlas cell: ${cell}`);
  return Number(match[1]) * ATLAS_COLUMNS + Number(match[2]);
}

/** Which cells a palette recolours on one texture: 0 keep, 1 primary, 2 accent. */
export function paletteRoles(materialName: string, paletteId: string): number[] {
  const roles = new Array<number>(CELL_COUNT).fill(ROLE_NONE);
  const cells = CLOTHING_CELLS[materialName];
  if (!cells || !PALETTE_COLORS[paletteId]) return roles;
  for (const cell of cells.primary) roles[cellIndex(cell)] = ROLE_PRIMARY;
  for (const cell of cells.accent) roles[cellIndex(cell)] = ROLE_ACCENT;
  return roles;
}

interface PaletteUniforms {
  uPaletteRole: { value: number[] };
  uCellLuma: { value: number[] };
  uPalettePrimary: { value: Color };
  uPaletteAccent: { value: Color };
}

const PALETTE_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  vec2 paletteCell = floor( clamp( vMapUv, 0.0, 0.9999 ) * vec2( ${ATLAS_COLUMNS}.0, ${ATLAS_ROWS}.0 ) );
  int paletteIndex = int( paletteCell.y ) * ${ATLAS_COLUMNS} + int( paletteCell.x );
  float paletteRole = uPaletteRole[ paletteIndex ];
  if ( paletteRole > 0.5 ) {
    vec3 paletteTarget = paletteRole > 1.5 ? uPaletteAccent : uPalettePrimary;
    float paletteLuma = dot( sampledDiffuseColor.rgb, vec3( ${LUMA.join(', ')} ) );
    sampledDiffuseColor.rgb = clamp( paletteTarget * ( paletteLuma / max( uCellLuma[ paletteIndex ], 0.0001 ) ), 0.0, 1.0 );
  }
  diffuseColor *= sampledDiffuseColor;
#endif
`;

const PALETTE_UNIFORMS = /* glsl */ `
uniform float uPaletteRole[ ${CELL_COUNT} ];
uniform float uCellLuma[ ${CELL_COUNT} ];
uniform vec3 uPalettePrimary;
uniform vec3 uPaletteAccent;
`;

const srgbToLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

/**
 * Average linear luma of each atlas cell, from the texture drawn down to 8x4 pixels. All ones
 * where no canvas is available (the palette then only shifts hue, still readable).
 */
function measureCellLuma(texture: Texture | null): number[] {
  const fallback = new Array<number>(CELL_COUNT).fill(1);
  const image = texture?.image as CanvasImageSource | undefined;
  if (!image || typeof document === 'undefined') return fallback;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS;
  canvas.height = ATLAS_ROWS;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return fallback;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, ATLAS_COLUMNS, ATLAS_ROWS);
  const pixels = context.getImageData(0, 0, ATLAS_COLUMNS, ATLAS_ROWS).data;
  return Array.from({ length: CELL_COUNT }, (_, cell) => {
    const [r, g, b] = [0, 1, 2].map((channel) => srgbToLinear(pixels[cell * 4 + channel] / 255));
    return LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;
  });
}

const lumaCache = new WeakMap<Texture, number[]>();

/** Adds the palette uniforms and shader code to a material the figure owns. */
function installPaletteShader(material: MeshStandardMaterial): PaletteUniforms {
  const map = material.map;
  let cellLuma = map ? lumaCache.get(map) : undefined;
  if (!cellLuma) {
    cellLuma = measureCellLuma(map);
    if (map) lumaCache.set(map, cellLuma);
  }
  const uniforms: PaletteUniforms = {
    uPaletteRole: { value: new Array<number>(CELL_COUNT).fill(ROLE_NONE) },
    uCellLuma: { value: cellLuma },
    uPalettePrimary: { value: new Color() },
    uPaletteAccent: { value: new Color() },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PALETTE_UNIFORMS}`)
      .replace('#include <map_fragment>', PALETTE_FRAGMENT);
  };
  // One shader program for every figure; the uniforms differ per material.
  material.customProgramCacheKey = () => 'character-palette';
  material.userData.palette = uniforms;
  return uniforms;
}

/**
 * Gives a cloned figure its own copies of the shared materials, so its palette does not repaint
 * other figures. One copy per original material, with the palette shader installed.
 */
export function ownFigureMaterials(figure: Object3D): Material[] {
  const copies = new Map<Material, Material>();
  figure.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; material?: Material };
    if (!mesh.isMesh || !mesh.material) return;
    let copy = copies.get(mesh.material);
    if (!copy) {
      copy = mesh.material.clone();
      installPaletteShader(copy as MeshStandardMaterial);
      copies.set(mesh.material, copy);
    }
    mesh.material = copy;
  });
  return [...copies.values()];
}

/** Recolours a figure prepared with ownFigureMaterials. */
export function applyPalette(figure: Object3D, paletteId: string): void {
  const colors = PALETTE_COLORS[paletteId];
  const seen = new Set<Material>();
  figure.traverse((object) => {
    const material = (object as Object3D & { material?: Material }).material;
    const uniforms = material?.userData.palette as PaletteUniforms | undefined;
    if (!material || !uniforms || seen.has(material)) return;
    seen.add(material);
    uniforms.uPaletteRole.value = paletteRoles(material.name, paletteId);
    if (colors) {
      uniforms.uPalettePrimary.value.set(colors.primary);
      uniforms.uPaletteAccent.value.set(colors.accent);
    }
  });
}
