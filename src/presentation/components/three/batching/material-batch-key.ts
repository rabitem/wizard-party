import * as THREE from 'three';

/** Built-in materials whose whole look is described by the properties below. */
const BATCHABLE_TYPES = new Set(['MeshBasicMaterial', 'MeshLambertMaterial', 'MeshStandardMaterial']);

const SCALAR_KEYS = [
  'side', 'transparent', 'opacity', 'alphaTest', 'alphaToCoverage', 'blending', 'depthTest', 'depthWrite',
  'colorWrite', 'toneMapped', 'fog', 'wireframe', 'flatShading', 'vertexColors', 'premultipliedAlpha',
  'dithering', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'roughness', 'metalness',
  'emissiveIntensity', 'envMapIntensity', 'reflectivity', 'refractionRatio', 'lightMapIntensity',
  'aoMapIntensity', 'bumpScale', 'displacementScale', 'displacementBias', 'combine',
] as const;

const TEXTURE_KEYS = [
  'map', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap',
  'bumpMap', 'displacementMap', 'envMap', 'specularMap',
] as const;

const COLOR_KEYS = ['emissive', 'specular'] as const;

type MaterialRecord = THREE.Material & Record<string, unknown>;

function hasCustomShader(material: THREE.Material): boolean {
  return material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile
    || material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey;
}

/**
 * Identity of a material's look apart from its base colour, or null when the material cannot be
 * shared by merged geometry (shader, physical or customised materials). Two meshes with the same
 * key render identically with one material, given each keeps its own base colour.
 */
export function batchKey(material: THREE.Material): string | null {
  if (!BATCHABLE_TYPES.has(material.type) || hasCustomShader(material)) return null;
  const record = material as MaterialRecord;
  const parts: string[] = [material.type];
  for (const key of SCALAR_KEYS) {
    if (key in record) parts.push(`${key}=${String(record[key])}`);
  }
  for (const key of TEXTURE_KEYS) {
    const texture = record[key] as THREE.Texture | null | undefined;
    if (texture) parts.push(`${key}=${texture.uuid}`);
  }
  for (const key of COLOR_KEYS) {
    const color = record[key] as THREE.Color | undefined;
    if (color?.isColor) parts.push(`${key}=${color.getHexString()}`);
  }
  const normalScale = record.normalScale as THREE.Vector2 | undefined;
  if (normalScale?.isVector2) parts.push(`normalScale=${normalScale.x},${normalScale.y}`);
  return parts.join('|');
}

function baseColor(material: THREE.Material): THREE.Color | null {
  const color = (material as MaterialRecord).color as THREE.Color | undefined;
  return color?.isColor ? color : null;
}

/**
 * Whether the base colour can move into a vertex colour attribute, so meshes that differ only in
 * colour share one draw: the material does not already use vertex colours and the geometry has
 * none of its own.
 */
export function colorFoldable(material: THREE.Material, geometry: THREE.BufferGeometry): boolean {
  return baseColor(material) !== null && !material.vertexColors && !geometry.hasAttribute('color');
}

/** Base colour as part of a group key, for materials whose colour is not folded. */
export function baseColorKey(material: THREE.Material): string {
  return baseColor(material)?.getHexString() ?? '-';
}
