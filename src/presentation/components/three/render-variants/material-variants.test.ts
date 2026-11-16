import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MaterialVariantCache } from './material-variants';

describe('material variants', () => {
  it('keeps material tint and every allocated instance neutral across growing card counts', () => {
    const material = new THREE.MeshStandardMaterial({ color: '#808080' });
    const tint = material.color.clone();
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 6);
    mesh.count = 2;
    const cache = new MaterialVariantCache();
    cache.prepare(mesh);
    const color = new THREE.Color();
    for (let i = 0; i < 6; i++) { mesh.getColorAt(i, color); expect(color.toArray()).toEqual([1, 1, 1]); }
    expect(material.color).toEqual(tint);
    expect(material.vertexColors).toBe(true);
    const colors = mesh.geometry.getAttribute('color');
    cache.prepare(mesh);
    expect(mesh.geometry.getAttribute('color')).toBe(colors);
  });

  it('preserves enabled vertex colours and keeps disabled colours disabled on shared geometry', () => {
    const geometry = new THREE.BoxGeometry();
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors[i] = 1;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const colored = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
    const plain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    const disposeOriginal = vi.fn(); geometry.addEventListener('dispose', disposeOriginal);
    const cache = new MaterialVariantCache();
    cache.prepare(colored); cache.prepare(plain);
    expect(colored.geometry.getAttribute('color').getY(0)).toBe(0);
    expect(plain.geometry.getAttribute('color').getY(0)).toBe(1);
    expect(plain.geometry).not.toBe(geometry);
    cache.dispose();
    expect(disposeOriginal).not.toHaveBeenCalled();
  });

  it('remembers disabled colours when another mesh has already prepared a shared material', () => {
    const material = new THREE.MeshBasicMaterial();
    const cache = new MaterialVariantCache();
    cache.prepare(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const colored = new THREE.BoxGeometry();
    colored.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colored.getAttribute('position').count * 3), 3));
    const replacement = new THREE.Mesh(colored, material);
    cache.prepare(replacement);
    expect(replacement.geometry.getAttribute('color').getX(0)).toBe(1);
    expect(colored.getAttribute('color').getX(0)).toBe(0);
  });

  it('bakes flat triangle normals without changing the sphere surface or other users', () => {
    const geometry = new THREE.SphereGeometry(1, 8, 4);
    const original = geometry.getAttribute('normal');
    const material = new THREE.MeshStandardMaterial({ flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    new MaterialVariantCache().prepare(mesh);
    expect(mesh.geometry).not.toBe(geometry);
    expect(geometry.getAttribute('normal')).toBe(original);
    expect(material.flatShading).toBe(false);
    const normals = mesh.geometry.getAttribute('normal');
    for (let i = 0; i < normals.count; i += 3) {
      expect(new THREE.Vector3().fromBufferAttribute(normals, i)).toEqual(new THREE.Vector3().fromBufferAttribute(normals, i + 1));
      expect(new THREE.Vector3().fromBufferAttribute(normals, i)).toEqual(new THREE.Vector3().fromBufferAttribute(normals, i + 2));
    }
    mesh.geometry.computeBoundingSphere();
    expect(mesh.geometry.boundingSphere?.radius).toBeCloseTo(1);
  });

  it('preserves authored maps and normals while neutral surfaces share sampler layouts', () => {
    const authored = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() });
    authored.normalScale.set(0.4, 0.8);
    const maps = [authored.map, authored.normalMap, authored.roughnessMap];
    const neutral = new THREE.MeshStandardMaterial();
    const cache = new MaterialVariantCache();
    cache.prepare(new THREE.Mesh(new THREE.BoxGeometry(), authored));
    cache.prepare(new THREE.Mesh(new THREE.BoxGeometry(), neutral));
    expect([authored.map, authored.normalMap, authored.roughnessMap]).toEqual(maps);
    expect(authored.normalScale.toArray()).toEqual([0.4, 0.8]);
    expect(neutral.normalScale.toArray()).toEqual([0, 0]);
    expect((neutral.map as THREE.DataTexture).image.data).toEqual(new Uint8Array([255, 255, 255, 255]));
    expect((neutral.roughnessMap as THREE.DataTexture).image.data).toEqual(new Uint8Array([255, 255, 255, 255]));
  });

  it('keeps authored particle colours while a uniform-colour burst uses a neutral attribute', () => {
    const colored = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ vertexColors: true }));
    colored.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    colored.geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 0, 0], 3));
    const uniform = new THREE.Points(colored.geometry.clone(), new THREE.PointsMaterial({ color: 'blue' }));
    const cache = new MaterialVariantCache();
    cache.prepare(colored);
    cache.prepare(uniform);
    expect(Array.from(colored.geometry.getAttribute('color').array)).toEqual([1, 0, 0]);
    expect(Array.from(uniform.geometry.getAttribute('color').array)).toEqual([1, 1, 1]);
    expect(uniform.material.color.getHexString()).toBe('0000ff');
  });

  it('leaves unregistered custom shaders and their attributes untouched', () => {
    const material = new THREE.MeshStandardMaterial(); material.onBeforeCompile = () => undefined;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    new MaterialVariantCache().prepare(mesh);
    expect(material.vertexColors).toBe(false);
    expect(mesh.geometry.hasAttribute('color')).toBe(false);
  });
});
