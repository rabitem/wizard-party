import type * as THREE from 'three';
import { PIXEL_VOXEL_COLORS as V } from '@/presentation/config/pixel-environment.config';
import { buildVoxelGeometry, extrudeSprite, type VoxelAnchor, type VoxelModel } from './voxel-geometry';

/**
 * Generic 8-bit voxel props: a spotted mushroom, a coin, a bonus block with
 * a plus emblem, a brick block and a heart. Geometries are built once and
 * shared by the room and the rim decor (like the shared glow texture).
 */

export type VoxelModelId = 'mushroom' | 'coin' | 'bonus' | 'brick' | 'heart';

const MUSHROOM_SPOTS: ReadonlyArray<[number, number, number]> = [
  [5, 10.5, 5],
  [0.4, 7, 5],
  [10.6, 7, 5],
  [5, 7, 0.4],
  [5, 7, 10.6],
  [1.8, 9.2, 1.8],
  [8.2, 9.2, 8.2],
];

function mushroom(): VoxelModel {
  const c = 5;
  return {
    size: [11, 11, 11],
    sample: (x, y, z) => {
      const dx = x + 0.5 - (c + 0.5);
      const dz = z + 0.5 - (c + 0.5);
      const r = Math.hypot(dx, dz);
      if (y < 4) {
        if (r > 2.7) return null;
        return y === 0 || r > 2.2 ? V.stemShade : V.stem;
      }
      const t = (y - 3.6) / 7;
      const capRadius = 5.7 * Math.sqrt(Math.max(0, 1 - t * t));
      if (r > capRadius) return null;
      const spot = MUSHROOM_SPOTS.some(([sx, sy, sz]) => Math.hypot(x + 0.5 - sx, y + 0.5 - sy, z + 0.5 - sz) < 1.9);
      if (spot) return V.spot;
      return y === 4 ? V.capShade : V.capRed;
    },
  };
}

const COIN_MAP = [
  '..ooooo..',
  '.oaaaaao.',
  'oahabaaao',
  'oahabaaao',
  'oaaabaaao',
  'oaaabaaao',
  'oaaabaaao',
  '.oaaaaao.',
  '..ooooo..',
];

const HEART_MAP = ['.aaa.aaa.', 'ahhaaaaaa', 'ahaaaaaaa', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '...aaa...', '....a....'];

const BLOCK_SIZE = 6;
const BLOCK_EDGE = new Set([0, BLOCK_SIZE - 1]);

/** Face coordinates (u, v) of a surface cell, or null for edges / interior */
function blockFace(x: number, y: number, z: number): { u: number; v: number } | null {
  const onEdge = [x, y, z].filter((n) => BLOCK_EDGE.has(n)).length;
  if (onEdge !== 1) return null;
  if (BLOCK_EDGE.has(x)) return { u: z, v: y };
  if (BLOCK_EDGE.has(y)) return { u: x, v: z };
  return { u: x, v: y };
}

function bonusBlock(): VoxelModel {
  return {
    size: [BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE],
    sample: (x, y, z) => {
      const face = blockFace(x, y, z);
      const edges = [x, y, z].filter((n) => BLOCK_EDGE.has(n)).length;
      if (edges >= 2) return V.blockShade;
      if (!face) return V.block;
      const { u, v } = face;
      const rivet = (u === 1 || u === 4) && (v === 1 || v === 4);
      if (rivet) return V.blockShade;
      const plus = ((u === 2 || u === 3) && v >= 1 && v <= 4) || ((v === 2 || v === 3) && u >= 1 && u <= 4);
      return plus ? V.blockMark : V.block;
    },
  };
}

function brickBlock(): VoxelModel {
  return {
    size: [BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE],
    sample: (x, y, z) => {
      if (y % 3 === 2 && y !== BLOCK_SIZE - 1) return V.mortar;
      const offset = Math.floor(y / 3) % 2 === 0 ? 0 : 3;
      const around = BLOCK_EDGE.has(x) ? z : x;
      return (around + offset) % BLOCK_SIZE === 0 ? V.mortar : V.brick;
    },
  };
}

const MODELS: Record<VoxelModelId, () => VoxelModel> = {
  mushroom,
  coin: () => extrudeSprite(COIN_MAP, { o: V.coinShade, a: V.coin, h: V.coinShine, b: V.coinShade }, 1),
  bonus: bonusBlock,
  brick: brickBlock,
  heart: () => extrudeSprite(HEART_MAP, { a: V.heart, h: V.heartShine }, 2),
};

const cache = new Map<string, THREE.BufferGeometry>();

/** Shared voxel geometry (built on first use, kept for the session). */
export function getVoxelGeometry(id: VoxelModelId, anchor: VoxelAnchor = 'base'): THREE.BufferGeometry {
  const key = `${id}:${anchor}`;
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = buildVoxelGeometry(MODELS[id](), anchor);
    cache.set(key, geometry);
  }
  return geometry;
}
