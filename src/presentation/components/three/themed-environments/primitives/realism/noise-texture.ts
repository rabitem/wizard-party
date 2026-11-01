import * as THREE from 'three';
import { GROUND_FOG } from '@/presentation/config/realism.config';
import { tileableFbm } from './noise';

let fogNoise: THREE.DataTexture | null = null;

/** Shared tileable soft noise (R channel) for fog and haze shaders. */
export function getFogNoiseTexture(): THREE.DataTexture {
  if (fogNoise) return fogNoise;
  const size = GROUND_FOG.NOISE_TEXTURE_SIZE;
  const values = tileableFbm(size, 23, 4, 4, 0.55);
  const bytes = new Uint8Array(size * size * 4);
  for (let i = 0; i < values.length; i++) {
    const v = Math.round(values[i] * 255);
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }
  fogNoise = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  fogNoise.wrapS = THREE.RepeatWrapping;
  fogNoise.wrapT = THREE.RepeatWrapping;
  fogNoise.magFilter = THREE.LinearFilter;
  fogNoise.minFilter = THREE.LinearMipmapLinearFilter;
  fogNoise.generateMipmaps = true;
  fogNoise.needsUpdate = true;
  return fogNoise;
}
