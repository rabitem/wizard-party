import * as THREE from 'three';
import { heightToNormalPixels, tileableFbm } from './noise';

const DETAIL_SIZE = 256;

interface DetailTextures {
  roughness: THREE.Texture;
  normal: THREE.Texture;
}

let detail: DetailTextures | null = null;
const repeated = new Map<string, DetailTextures>();

function dataTexture(pixels: Uint8ClampedArray): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(pixels.buffer), DETAIL_SIZE, DETAIL_SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function getDetail(): DetailTextures {
  if (detail) return detail;
  const height = tileableFbm(DETAIL_SIZE, 41, 8, 4, 0.55);
  const rough = new Uint8ClampedArray(DETAIL_SIZE * DETAIL_SIZE * 4);
  for (let i = 0; i < height.length; i++) {
    // Centred near 1 so roughness keeps its average; the material's variation scales the spread.
    const value = 255 * (0.82 + height[i] * 0.18);
    rough[i * 4] = value;
    rough[i * 4 + 1] = value;
    rough[i * 4 + 2] = value;
    rough[i * 4 + 3] = 255;
  }
  detail = { roughness: dataTexture(rough), normal: dataTexture(heightToNormalPixels(height, DETAIL_SIZE, 3)) };
  return detail;
}

export interface SurfaceDetailOptions {
  /** Detail tiles per UV unit */
  scale?: number;
  /** Normal map intensity */
  normalStrength?: number;
}

/**
 * Adds subtle roughness variation and fine normal detail (a shared tileable
 * noise pair) to an existing MeshStandardMaterial, so flat-coloured props
 * stop looking like plastic. Maps the material already has are left alone.
 * Returns the material for chaining. Textures are cached; do not dispose them.
 */
export function addSurfaceDetail<T extends THREE.MeshStandardMaterial>(material: T, options: SurfaceDetailOptions = {}): T {
  const scale = options.scale ?? 4;
  const key = String(scale);
  let textures = repeated.get(key);
  if (!textures) {
    const base = getDetail();
    const roughness = base.roughness.clone();
    const normal = base.normal.clone();
    roughness.repeat.set(scale, scale);
    normal.repeat.set(scale, scale);
    roughness.needsUpdate = true;
    normal.needsUpdate = true;
    textures = { roughness, normal };
    repeated.set(key, textures);
  }
  const strength = options.normalStrength ?? 0.25;
  if (!material.roughnessMap) material.roughnessMap = textures.roughness;
  if (!material.normalMap) {
    material.normalMap = textures.normal;
    material.normalScale.set(strength, strength);
  }
  material.needsUpdate = true;
  return material;
}
