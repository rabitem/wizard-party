/**
 * Shared, lazily painted textures for the card-land effects. Each texture is
 * painted once per page and reused by every card; they are tiny and never
 * disposed.
 */

import * as THREE from 'three';
import { createPaintedTexture } from '../../themed-environments/primitives/canvas-texture';
import {
  paintCrystal,
  paintLeaf,
  paintPetal,
  paintSoftDot,
  paintSpark,
  paintSquare,
} from './particle-textures';
import { createBurstPainter, paintInkSplat, paintPlusOne } from './comic-textures';

export type FxTextureId =
  | 'soft'
  | 'spark'
  | 'leaf'
  | 'petal'
  | 'square'
  | 'crystal'
  | 'ink'
  | 'bam'
  | 'pow'
  | 'plusOne';

interface TextureSpec {
  size: number;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  pixelated?: boolean;
}

const SPECS: Readonly<Record<FxTextureId, TextureSpec>> = {
  soft: { size: 64, paint: paintSoftDot },
  spark: { size: 64, paint: paintSpark },
  leaf: { size: 64, paint: paintLeaf },
  petal: { size: 64, paint: paintPetal },
  square: { size: 16, paint: paintSquare, pixelated: true },
  crystal: { size: 64, paint: paintCrystal },
  ink: { size: 128, paint: paintInkSplat },
  bam: { size: 256, paint: createBurstPainter('BAM!') },
  pow: { size: 256, paint: createBurstPainter('POW!') },
  plusOne: { size: 64, paint: paintPlusOne, pixelated: true },
};

const cache = new Map<FxTextureId, THREE.Texture>();

export function getFxTexture(id: FxTextureId): THREE.Texture {
  const cached = cache.get(id);
  if (cached) return cached;
  const spec = SPECS[id];
  const texture = createPaintedTexture(spec.size, spec.size, spec.paint);
  if (spec.pixelated) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  }
  // Only cache real canvas textures; SSR placeholders get repainted on the client
  if (typeof document !== 'undefined') cache.set(id, texture);
  return texture;
}
