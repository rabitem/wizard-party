import * as THREE from 'three';

// Shared 1px maps keep equivalent built-in surfaces on one sampler layout. Real maps retain
// their UV transforms; neutral maps read white, and a zero normal scale keeps the vertex normal.
const color = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
color.colorSpace = THREE.SRGBColorSpace;
color.needsUpdate = true;
const data = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
data.needsUpdate = true;

export function unifyMaterialMaps(material: THREE.Material): void {
  if (material.type === 'MeshBasicMaterial') {
    const basic = material as THREE.MeshBasicMaterial;
    if (!basic.map) { basic.map = color; basic.needsUpdate = true; }
    return;
  }
  if (!['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshToonMaterial'].includes(material.type)) return;
  const standard = material as THREE.MeshStandardMaterial;
  const roughness = material.type !== 'MeshToonMaterial';
  // Three prioritises a normal map over a bump map. A neutral placeholder must not mask an
  // authored height map, or enter the object-space normal path where normalScale is not neutral.
  const neutralNormal = !standard.normalMap && !standard.bumpMap && standard.normalMapType === THREE.TangentSpaceNormalMap;
  const changed = !standard.map || (roughness && !standard.roughnessMap) || neutralNormal;
  if (!standard.map) standard.map = color;
  if (roughness && !standard.roughnessMap) standard.roughnessMap = data;
  if (neutralNormal) {
    standard.normalMap = data;
    standard.normalScale.set(0, 0);
  }
  if (changed) standard.needsUpdate = true;
}
