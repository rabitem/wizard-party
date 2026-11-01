import * as THREE from 'three';
import { DEVICE_TIER } from '@/presentation/config/realism.config';
import { getDeviceTier } from './device-tier';
import { heightToNormalPixels } from './noise';
import { PBR_DEFAULT_COLORS, PBR_PAINTERS, type PbrPixels, type PbrSurface, type Rgb } from './pbr-painters';

export interface PbrTextureSet {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
  normalMap: THREE.Texture;
}

export interface PbrTextureOptions {
  /** Main colour (sRGB hex); defaults per surface */
  color?: string;
  /** Secondary colour: grain, mortar, hollows... */
  accent?: string;
  /** Edge length in px; defaults to the device tier size (256 / 512 / 1024) */
  size?: number;
  seed?: number;
  /** UV repeat; sets sharing a base differ only by repeat and share one GPU upload */
  repeat?: readonly [number, number];
  /** Slope scale of the generated normal map */
  normalStrength?: number;
}

const baseCache = new Map<string, PbrTextureSet>();
const repeatCache = new Map<string, PbrTextureSet>();

function toRgb(hex: string): Rgb {
  const color = new THREE.Color();
  color.setStyle(hex, THREE.NoColorSpace);
  return [color.r, color.g, color.b];
}

function canvasTexture(size: number, pixels: Uint8ClampedArray, colorSpace: THREE.ColorSpace): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function toBytes(values: Float32Array, channels: 1 | 3): Uint8ClampedArray {
  const count = values.length / channels;
  const bytes = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    const r = values[i * channels];
    bytes[i * 4] = r * 255;
    bytes[i * 4 + 1] = (channels === 3 ? values[i * 3 + 1] : r) * 255;
    bytes[i * 4 + 2] = (channels === 3 ? values[i * 3 + 2] : r) * 255;
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
}

function buildSet(pixels: PbrPixels, normalStrength: number): PbrTextureSet {
  const { size } = pixels;
  return {
    map: canvasTexture(size, toBytes(pixels.albedo, 3), THREE.SRGBColorSpace),
    roughnessMap: canvasTexture(size, toBytes(pixels.roughness, 1), THREE.NoColorSpace),
    normalMap: canvasTexture(size, heightToNormalPixels(pixels.height, size, normalStrength * (size / 64)), THREE.NoColorSpace),
  };
}

function emptySet(): PbrTextureSet {
  return { map: new THREE.Texture(), roughnessMap: new THREE.Texture(), normalMap: new THREE.Texture() };
}

function withRepeat(set: PbrTextureSet, repeat: readonly [number, number]): PbrTextureSet {
  const clone = (texture: THREE.Texture) => {
    const copy = texture.clone();
    copy.repeat.set(repeat[0], repeat[1]);
    copy.needsUpdate = true;
    return copy;
  };
  return { map: clone(set.map), roughnessMap: clone(set.roughnessMap), normalMap: clone(set.normalMap) };
}

/**
 * Procedural colour + roughness + normal maps for a surface, cached by
 * every option, so rooms can call this freely in useMemo. Cached textures
 * are shared across rooms: do not dispose them.
 */
export function getPbrTextureSet(surface: PbrSurface, options: PbrTextureOptions = {}): PbrTextureSet {
  if (typeof document === 'undefined') return emptySet();
  const [defaultBase, defaultAccent] = PBR_DEFAULT_COLORS[surface];
  const color = options.color ?? defaultBase;
  const accent = options.accent ?? defaultAccent;
  const size = options.size ?? DEVICE_TIER.PBR_TEXTURE_SIZE[getDeviceTier()];
  const seed = options.seed ?? 1;
  const normalStrength = options.normalStrength ?? 1;
  const baseKey = [surface, color, accent, size, seed, normalStrength].join('|');

  let base = baseCache.get(baseKey);
  if (!base) {
    const pixels = PBR_PAINTERS[surface]({ size, seed, base: toRgb(color), accent: toRgb(accent) });
    base = buildSet(pixels, normalStrength);
    baseCache.set(baseKey, base);
  }
  if (!options.repeat) return base;

  const repeatKey = `${baseKey}|${options.repeat.join('x')}`;
  let repeated = repeatCache.get(repeatKey);
  if (!repeated) {
    repeated = withRepeat(base, options.repeat);
    repeatCache.set(repeatKey, repeated);
  }
  return repeated;
}

export interface PbrMaterialOptions extends PbrTextureOptions {
  /** Normal map intensity on the material */
  normalScale?: number;
  /** Multiplies the roughness map (MeshStandardMaterial.roughness) */
  roughness?: number;
  metalness?: number;
}

/** MeshStandardMaterial using a procedural PBR set (the material is yours to dispose; textures are cached). */
export function createPbrMaterial(surface: PbrSurface, options: PbrMaterialOptions = {}): THREE.MeshStandardMaterial {
  const set = getPbrTextureSet(surface, options);
  const scale = options.normalScale ?? 0.6;
  return new THREE.MeshStandardMaterial({
    map: set.map,
    roughnessMap: set.roughnessMap,
    normalMap: set.normalMap,
    normalScale: new THREE.Vector2(scale, scale),
    roughness: options.roughness ?? 1,
    metalness: options.metalness ?? 0,
  });
}
