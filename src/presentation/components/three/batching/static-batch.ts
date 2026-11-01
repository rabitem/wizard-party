import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { baseColorKey, batchKey, colorFoldable } from './material-batch-key';

/** The merged meshes that replace a static subtree's meshes, and the meshes they replace. */
export interface StaticBatchResult {
  meshes: THREE.Mesh[];
  sources: THREE.Mesh[];
  /** Materials created for colour folding (owned by the batch, disposed with it). */
  ownedMaterials: THREE.Material[];
}

interface BatchEntry {
  mesh: THREE.Mesh;
  /** Transform from the mesh into the batch root's space */
  matrix: THREE.Matrix4;
}

interface BatchGroup {
  material: THREE.Material;
  foldColor: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
  entries: BatchEntry[];
}

/** Plain, visible, single-material meshes without morphs or skinning are batchable. */
function isBatchable(object: THREE.Object3D): object is THREE.Mesh {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh || !mesh.visible) return false;
  if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if (Array.isArray(mesh.material) || Object.keys(mesh.geometry.morphAttributes).length > 0) return false;
  return mesh.geometry.hasAttribute('position');
}

function geometrySignature(geometry: THREE.BufferGeometry, foldColor: boolean): string {
  const attributes = Object.entries(geometry.attributes)
    .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
    .sort();
  if (foldColor) attributes.push('color:3:0');
  return `${geometry.index ? 'i' : 'n'}|${attributes.join(',')}`;
}

/** Visible meshes below `root` (not root itself), skipping hidden subtrees. */
function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const visit = (object: THREE.Object3D) => {
    if (!object.visible) return;
    if (object !== root && isBatchable(object)) meshes.push(object);
    object.children.forEach(visit);
  };
  visit(root);
  return meshes;
}

function groupMeshes(root: THREE.Object3D): BatchGroup[] {
  root.updateWorldMatrix(true, true);
  const toRoot = root.matrixWorld.clone().invert();
  const groups = new Map<string, BatchGroup>();
  for (const mesh of collectMeshes(root)) {
    const material = mesh.material as THREE.Material;
    const materialKey = batchKey(material);
    if (materialKey === null) continue;
    const matrix = toRoot.clone().multiply(mesh.matrixWorld);
    // A mirroring transform flips the triangle winding, which merged geometry cannot express
    if (matrix.determinant() <= 0) continue;
    const foldColor = colorFoldable(material, mesh.geometry);
    const colorKey = foldColor ? 'vertex' : baseColorKey(material);
    const key = [materialKey, colorKey, geometrySignature(mesh.geometry, foldColor), mesh.castShadow, mesh.receiveShadow, mesh.renderOrder].join('#');
    let group = groups.get(key);
    if (!group) {
      group = { material, foldColor, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, renderOrder: mesh.renderOrder, entries: [] };
      groups.set(key, group);
    }
    group.entries.push({ mesh, matrix });
  }
  return [...groups.values()];
}

/** A copy of the entry's geometry in root space, with its material colour as vertex colour. */
function bakeGeometry({ mesh, matrix }: BatchEntry, foldColor: boolean): THREE.BufferGeometry {
  const geometry = mesh.geometry.clone().applyMatrix4(matrix);
  geometry.clearGroups();
  if (foldColor) {
    const color = (mesh.material as THREE.MeshBasicMaterial).color;
    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  return geometry;
}

function foldedMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone() as THREE.MeshBasicMaterial;
  material.color.setRGB(1, 1, 1);
  material.vertexColors = true;
  return material;
}

function buildGroupMesh(group: BatchGroup, ownedMaterials: THREE.Material[]): THREE.Mesh | null {
  const parts = group.entries.map((entry) => bakeGeometry(entry, group.foldColor));
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) return null;
  const material = group.foldColor ? foldedMaterial(group.material) : group.material;
  if (group.foldColor) ownedMaterials.push(material);
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = 'static-batch';
  mesh.castShadow = group.castShadow;
  mesh.receiveShadow = group.receiveShadow;
  mesh.renderOrder = group.renderOrder;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/**
 * Merges the static meshes below `root` into one mesh per material (or per material look, with
 * colour carried as vertex colour where only the colour differs), with transforms baked relative
 * to `root`. three.js pays a fixed CPU and driver cost per draw call regardless of mesh size, so
 * a slot machine of 22 meshes becomes a handful of draws for the whole row.
 *
 * Only groups of two or more meshes are merged; everything else, including meshes with shader
 * or physical materials, stays as it is. Nothing is changed in the scene: the caller adds
 * `meshes` under root and hides `sources` (see StaticBatch.tsx).
 */
export function buildStaticBatch(root: THREE.Object3D): StaticBatchResult {
  const result: StaticBatchResult = { meshes: [], sources: [], ownedMaterials: [] };
  for (const group of groupMeshes(root)) {
    if (group.entries.length < 2) continue;
    const mesh = buildGroupMesh(group, result.ownedMaterials);
    if (!mesh) continue;
    result.meshes.push(mesh);
    result.sources.push(...group.entries.map((entry) => entry.mesh));
  }
  return result;
}

/** Releases what buildStaticBatch created (merged geometries and folded materials). */
export function disposeStaticBatch(result: StaticBatchResult): void {
  result.meshes.forEach((mesh) => mesh.geometry.dispose());
  result.ownedMaterials.forEach((material) => material.dispose());
}
