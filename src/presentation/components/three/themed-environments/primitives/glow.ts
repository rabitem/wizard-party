import * as THREE from 'three';
import { ENVIRONMENT_EFFECTS } from '@/presentation/config/themed-environment.config';

let glowTexture: THREE.Texture | null = null;

/** Soft radial falloff texture shared by every glow sprite/halo. */
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = ENVIRONMENT_EFFECTS.GLOW_TEXTURE_SIZE;
  if (typeof document === 'undefined') {
    glowTexture = new THREE.Texture();
    return glowTexture;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/** Additive sprite material for halos around flames, windows and potions. */
export function createGlowMaterial(color: string, opacity: number): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/**
 * Same additive glow for regular meshes (planes, discs). SpriteMaterial only works on
 * THREE.Sprite: on a Mesh the renderer reads the missing `object.center` and throws every frame.
 */
export function createGlowMeshMaterial(color: string, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Unlit emissive-looking material for flames and glowing liquids. */
export function createFlameMaterial(color: string, opacity = 0.95): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
