import * as THREE from 'three';
import { CELESTIAL_COLORS, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { addSurfaceDetail } from '../primitives';

interface MetalOptions {
  emissiveIntensity?: number;
  roughness?: number;
}

/**
 * Polished brass / gilded metal shared by the observatory props. Fine
 * roughness + normal variation breaks up the highlights (hand-polished, a
 * little tarnished) instead of a uniform plastic sheen; the faint warm
 * emissive keeps metal readable without an environment map.
 */
function createMetal(color: string, metalness: number, { emissiveIntensity = 0.25, roughness = 0.34 }: MetalOptions) {
  return addSurfaceDetail(
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive: CELESTIAL_COLORS.goldDeep,
      emissiveIntensity,
    }),
    CELESTIAL_REALISM.METAL_DETAIL,
  );
}

export function createBrassMaterial(options: MetalOptions = {}): THREE.MeshStandardMaterial {
  return createMetal(CELESTIAL_COLORS.brass, 0.7, options);
}

export function createGoldMaterial(options: MetalOptions = {}): THREE.MeshStandardMaterial {
  return createMetal(CELESTIAL_COLORS.gold, 0.65, options);
}
