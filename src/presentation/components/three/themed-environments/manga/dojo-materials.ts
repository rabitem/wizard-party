import * as THREE from 'three';
import { MANGA_WOOD_TEXTURE } from '@/presentation/config/manga-environment.config';
import { getPbrTextureSet } from '../primitives/realism';
import { createToonMaterial } from './manga-geometry';

export interface WoodToonMaterial {
  material: THREE.MeshToonMaterial;
  /** Owned texture views (share the cached image; dispose with the material) */
  map: THREE.Texture;
  normalMap: THREE.Texture;
}

function view(texture: THREE.Texture, vertical: boolean): THREE.Texture {
  const copy = texture.clone();
  if (vertical) {
    // setUvTransform rotates before it scales, so the repeat keeps meaning (along grain, across grain).
    copy.center.set(0.5, 0.5);
    copy.rotation = Math.PI / 2;
  }
  copy.needsUpdate = true;
  return copy;
}

/**
 * Cel-shaded wood that keeps the ink look but gains procedural grain and a
 * fine normal map: one plank row per face (MANGA_WOOD_TEXTURE.REPEAT), with
 * the grain turned upright for posts (`vertical`).
 */
export function createWoodToonMaterial(color: string, accent: string, vertical = false): WoodToonMaterial {
  const set = getPbrTextureSet('wood', { color, accent, repeat: MANGA_WOOD_TEXTURE.REPEAT, seed: vertical ? 7 : 3 });
  const map = view(set.map, vertical);
  const normalMap = view(set.normalMap, vertical);
  const scale = MANGA_WOOD_TEXTURE.NORMAL_SCALE;
  const material = createToonMaterial('#ffffff', { map, normalMap, normalScale: new THREE.Vector2(scale, scale) });
  return { material, map, normalMap };
}
