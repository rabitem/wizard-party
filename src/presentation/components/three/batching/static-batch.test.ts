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

  it('merges static instanced props while preserving each pose and tint', () => {
    const root = new THREE.Group();
    root.position.x = 10;
    const material = new THREE.MeshStandardMaterial();
    const first = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 2);
    first.setMatrixAt(0, new THREE.Matrix4());
    first.setMatrixAt(1, new THREE.Matrix4().makeTranslation(2, 0, 0));
    first.setColorAt(0, new THREE.Color('red'));
    first.setColorAt(1, new THREE.Color('blue'));
    const second = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 1);
    second.position.x = 4;
    second.setMatrixAt(0, new THREE.Matrix4());
    second.setColorAt(0, new THREE.Color('lime'));
    root.add(first, second);
    const batch = buildStaticBatch(root);
    expect(batch.meshes).toHaveLength(1);
    expect(new Set(batch.sources)).toEqual(new Set([first, second]));
    const geometry = batch.meshes[0].geometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-0.5);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(4.5);
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const expected = x < 1 ? [1, 0, 0] : x < 3 ? [0, 0, 1] : [0, 1, 0];
      expect([colors.getX(i), colors.getY(i), colors.getZ(i)]).toEqual(expected);
    }
    disposeStaticBatch(batch);
  });

  it('bakes a standalone static instance set without changing its pose or tint', () => {
    const root = new THREE.Group();
    const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 1);
    instances.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3, 2, 1));
    instances.setColorAt(0, new THREE.Color('red'));
    root.add(instances);
    const batch = buildStaticBatch(root);
    expect(batch.sources).toEqual([instances]);
    const geometry = batch.meshes[0].geometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.toArray()).toEqual([2.5, 1.5, 0.5]);
    const colors = geometry.getAttribute('color');
    expect([colors.getX(0), colors.getY(0), colors.getZ(0)]).toEqual([1, 0, 0]);
    disposeStaticBatch(batch);
  });

  it('keeps large instance sets instanced rather than expanding their vertex memory', () => {
    const root = new THREE.Group();
    root.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 10_000));
    expect(buildStaticBatch(root).sources).toEqual([]);
  });

  it('leaves translucent and individually animated material instances untouched', () => {
    const root = new THREE.Group();
    const flame = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 });
    const first = box(flame, 0);
    const second = box(flame, 2);
    root.add(first, second);
    expect(buildStaticBatch(root).sources).toEqual([]);
    flame.opacity = 0.5;
    expect((first.material as THREE.Material).opacity).toBe(0.5);
    expect((second.material as THREE.Material).opacity).toBe(0.5);
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
