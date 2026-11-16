import * as THREE from 'three';
import { isReplacedMesh } from '../batching/replaced-meshes';
import { isKnownMaterialPatch } from './normalizable-materials';
import { unifyMaterialMaps } from './neutral-material-maps';

/** Bake equivalent vertex inputs once, so neutral tint/flat-normal flags share shader programs. */
export class MaterialVariantCache {
  private readonly originalColors = new WeakMap<THREE.Material, boolean>();
  private readonly flatMaterials = new WeakSet<THREE.Material>();
  private readonly flatGeometries = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
  private readonly neutralGeometries = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
  private readonly baked = new WeakSet<THREE.BufferGeometry>();
  private readonly neutral = new WeakSet<THREE.BufferGeometry>();
  private readonly owned = new Set<THREE.BufferGeometry>();
  private readonly prepared = new WeakMap<THREE.Mesh | THREE.Points, { geometry: THREE.BufferGeometry; materials: { material: THREE.Material; version: number }[] }>();

  prepare(mesh: THREE.Mesh | THREE.Points): void {
    const before = this.prepared.get(mesh);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (before?.geometry === mesh.geometry && before.materials.length === materials.length &&
        before.materials.every((entry, i) => entry.material === materials[i] && entry.version === materials[i].version)) return;
    const supported = materials.every(m => (m.type === 'MeshStandardMaterial' || m.type === 'MeshBasicMaterial' || m.type === 'MeshPhysicalMaterial' || m.type === 'MeshToonMaterial' || m.type === 'PointsMaterial') &&
      ((m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey) || isKnownMaterialPatch(m)));
    if (!supported || !mesh.geometry.hasAttribute('position')) return;
    if (materials.some(material => material.type !== 'PointsMaterial')) {
      if (!mesh.geometry.hasAttribute('uv')) {
        const count = mesh.geometry.getAttribute('position').count;
        mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      materials.forEach(unifyMaterialMaps);
    }
    const originalColors = materials.map(material => {
      const known = this.originalColors.get(material);
      if (known !== undefined) return known;
      this.originalColors.set(material, material.vertexColors);
      return material.vertexColors;
    });
    const useColors = originalColors.every(Boolean);
    const ignoreColors = originalColors.every(enabled => !enabled);
    if (!useColors && !ignoreColors) return;
    this.prepareFlatNormals(mesh, materials);
    this.prepareTint(mesh, materials, ignoreColors);
    this.prepared.set(mesh, { geometry: mesh.geometry, materials: materials.map(material => ({ material, version: material.version })) });
  }

  private prepareFlatNormals(mesh: THREE.Mesh | THREE.Points, materials: THREE.Material[]): void {
    const flat = materials.every(m => (m as THREE.MeshStandardMaterial).flatShading || this.flatMaterials.has(m));
    if (flat && !this.baked.has(mesh.geometry)) {
      let geometry = this.flatGeometries.get(mesh.geometry);
      if (!geometry) {
        geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.computeVertexNormals();
        this.flatGeometries.set(mesh.geometry, geometry);
        this.baked.add(geometry);
        this.owned.add(geometry);
      }
      mesh.geometry = geometry;
      for (const material of materials) {
        this.flatMaterials.add(material);
        if ((material as THREE.MeshStandardMaterial).flatShading) {
          (material as THREE.MeshStandardMaterial).flatShading = false;
          material.needsUpdate = true;
        }
      }
    }
  }

  private prepareTint(mesh: THREE.Mesh | THREE.Points, materials: THREE.Material[], ignoreColors: boolean): void {
    if (ignoreColors && mesh.geometry.hasAttribute('color') && !this.neutral.has(mesh.geometry)) {
      let geometry = this.neutralGeometries.get(mesh.geometry);
      if (!geometry) {
        geometry = mesh.geometry.clone();
        this.whiteTint(geometry);
        this.neutralGeometries.set(mesh.geometry, geometry);
        this.owned.add(geometry);
      }
      mesh.geometry = geometry;
    } else if (!mesh.geometry.hasAttribute('color')) this.whiteTint(mesh.geometry);
    for (const material of materials) {
      if (!material.vertexColors) { material.vertexColors = true; material.needsUpdate = true; }
    }
    const instanced = mesh as THREE.InstancedMesh;
    if (instanced.isInstancedMesh && !instanced.instanceColor) {
      const white = new THREE.Color(1, 1, 1);
      for (let i = 0; i < instanced.instanceMatrix.count; i++) instanced.setColorAt(i, white);
    }
  }

  private whiteTint(geometry: THREE.BufferGeometry): void {
    const colors = new Float32Array(geometry.getAttribute('position').count * 3).fill(1);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.neutral.add(geometry);
  }

  prepareScene(scene: THREE.Scene): void {
    const visit = (object: THREE.Object3D) => {
      if (isReplacedMesh(object)) return;
      if ((object as THREE.Mesh).isMesh || (object as THREE.Points).isPoints) this.prepare(object as THREE.Mesh | THREE.Points);
      object.children.forEach(visit);
    };
    visit(scene);
  }

  dispose(): void { this.owned.forEach(g => g.dispose()); this.owned.clear(); }
}

const scenes = new WeakMap<THREE.Scene, MaterialVariantCache>();

/** Compile and draw use the same vertex-input preparation, including newly mounted effects. */
export function prepareSceneMaterials(scene: THREE.Scene): void { scenes.get(scene)?.prepareScene(scene); }
export function bindSceneMaterials(scene: THREE.Scene, cache: MaterialVariantCache): () => void {
  scenes.set(scene, cache);
  const previous = scene.onBeforeRender;
  const prepare: typeof previous = (...args) => { previous.apply(scene, args); cache.prepareScene(scene); };
  scene.onBeforeRender = prepare;
  return () => {
    if (scenes.get(scene) === cache) scenes.delete(scene);
    if (scene.onBeforeRender === prepare) scene.onBeforeRender = previous;
  };
}
