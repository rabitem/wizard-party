import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';

export interface WoodMaterialProps {
  map: THREE.Texture;
  roughness: number;
  metalness: number;
  color: string;
  moldingColor: string;
  apronColor: string;
  envMapIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalMap?: THREE.Texture;
  normalScale?: THREE.Vector2;
}

export interface LeatherMaterialProps {
  map: THREE.Texture | null;
  roughness: number;
  metalness: number;
  color: string;
  envMapIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: string;
  normalMap?: THREE.Texture;
  normalScale?: THREE.Vector2;
}

export interface TableTextures {
  woodMaterialProps: WoodMaterialProps;
  leatherMaterialProps: LeatherMaterialProps;
}

export interface WoodMaterialTextureInputs {
  /** Procedural wood grain colour map */
  woodTexture: THREE.Texture;
  woodNormalMap?: THREE.Texture | null;
}

export interface LeatherMaterialTextureInputs {
  leatherTexture?: THREE.Texture | null;
  leatherNormalMap?: THREE.Texture | null;
}

export const TABLE_GROUND_SHADOW = {
  COLOR: '#15100b',
  DISC_OPACITY: 0.16,
} as const;

export interface TableContactShadowProps {
  opacity: number;
  scale: number;
  blur: number;
  far: number;
  resolution: number;
  color: string;
  frames: number;
}

export function createWoodMaterialProps(
  tableTheme: TableThemePalette,
  textures: WoodMaterialTextureInputs
): WoodMaterialProps {
  return {
    map: textures.woodTexture,
    roughness: 0.32,
    metalness: 0.04,
    color: tableTheme.wood.base,
    moldingColor: tableTheme.wood.molding,
    apronColor: tableTheme.wood.apron,
    envMapIntensity: 1.2,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    ...(textures.woodNormalMap && {
      normalMap: textures.woodNormalMap,
      normalScale: new THREE.Vector2(0.2, 0.14),
    }),
  };
}

export function createLeatherMaterialProps(
  tableTheme: TableThemePalette,
  textures: LeatherMaterialTextureInputs
): LeatherMaterialProps {
  return {
    map: textures.leatherTexture ?? null,
    roughness: 0.54,
    metalness: 0.0,
    color: tableTheme.leather.base,
    envMapIntensity: 0.62,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
    sheen: 0.45,
    sheenRoughness: 0.82,
    sheenColor: '#8a5a45',
    ...(textures.leatherNormalMap && {
      normalMap: textures.leatherNormalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
    }),
  };
}

export function createTableContactShadowProps(): TableContactShadowProps {
  return {
    opacity: 0.38,
    scale: 7.8,
    blur: 3.8,
    far: 1.8,
    resolution: 1024,
    color: TABLE_GROUND_SHADOW.COLOR,
    frames: 1,
  };
}
