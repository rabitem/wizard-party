import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildStaticBatch, disposeStaticBatch } from './static-batch';

function box(material: THREE.Material, x: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(x, 0, 0);
  return mesh;
}

describe('buildStaticBatch', () => {
  it('should merge meshes that differ only in colour into one mesh with vertex colours', () => {
    const root = new THREE.Group();
    root.add(box(new THREE.MeshStandardMaterial({ color: 'red' }), 0), box(new THREE.MeshStandardMaterial({ color: 'blue' }), 2));

    const batch = buildStaticBatch(root);

    expect(batch.meshes).toHaveLength(1);
    expect(batch.sources).toHaveLength(2);
    const [merged] = batch.meshes;
    expect(merged.geometry.getAttribute('position').count).toBe(48);
    expect(merged.geometry.hasAttribute('color')).toBe(true);
    expect((merged.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
    expect(batch.ownedMaterials).toContain(merged.material);
    disposeStaticBatch(batch);
  });

  it('should bake each mesh transform relative to the batch root', () => {
    const root = new THREE.Group();
    root.position.set(10, 0, 0);
    const material = new THREE.MeshBasicMaterial();
    root.add(box(material, 0), box(material, 4));

    const [merged] = buildStaticBatch(root).meshes;
    merged.geometry.computeBoundingBox();

    expect(merged.geometry.boundingBox?.min.x).toBeCloseTo(-0.5);
    expect(merged.geometry.boundingBox?.max.x).toBeCloseTo(4.5);
  });

  it('should keep meshes with different shadow flags or looks apart and leave singles alone', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    const caster = box(material, 0);
    caster.castShadow = true;
    root.add(caster, box(material, 2), box(material, 4), box(new THREE.MeshStandardMaterial({ metalness: 1 }), 6));

    const batch = buildStaticBatch(root);

    expect(batch.meshes).toHaveLength(1);
    expect(batch.sources).toHaveLength(2);
    expect(batch.sources).not.toContain(caster);
  });

  it('should skip hidden subtrees and mirrored meshes', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    const hidden = new THREE.Group();
    hidden.visible = false;
    hidden.add(box(material, 0), box(material, 1));
    const mirrored = box(material, 2);
    mirrored.scale.x = -1;
    root.add(hidden, mirrored, box(material, 4));

    expect(buildStaticBatch(root).meshes).toHaveLength(0);
  });

  it('should leave shader, physical and customised materials unmerged', () => {
    const root = new THREE.Group();
    const shader = new THREE.ShaderMaterial();
    const physical = new THREE.MeshPhysicalMaterial();
    const patched = new THREE.MeshStandardMaterial();
    patched.onBeforeCompile = () => undefined;
    root.add(box(shader, 0), box(shader, 2), box(physical, 4), box(physical, 6), box(patched, 8), box(patched, 10));

    expect(buildStaticBatch(root).meshes).toHaveLength(0);
  });

  it('should keep vertex-coloured materials instead of folding their colour', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    root.add(box(material, 0), box(material, 2));

    const batch = buildStaticBatch(root);

    expect(batch.meshes).toHaveLength(1);
    expect(batch.meshes[0].material).toBe(material);
    expect(batch.ownedMaterials).toHaveLength(0);
  });
});
