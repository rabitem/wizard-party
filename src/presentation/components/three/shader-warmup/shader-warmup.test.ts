import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { collectSceneTextures, warmUpScene, type WarmupRenderer } from './shader-warmup';

describe('collectSceneTextures', () => {
  it('should collect material maps and shader uniform textures, including hidden objects', () => {
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const noise = new THREE.Texture();
    const scene = new THREE.Scene();
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map, normalMap }));
    hidden.visible = false;
    const shader = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.ShaderMaterial({ uniforms: { uNoise: { value: noise } } }));
    scene.add(hidden, shader);

    expect(collectSceneTextures(scene)).toEqual(new Set([map, normalMap, noise]));
  });

  it('should skip render target textures', () => {
    const target = new THREE.WebGLRenderTarget(4, 4);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: target.texture })));
    expect(collectSceneTextures(scene).size).toBe(0);
  });
});

describe('warmUpScene', () => {
  it('should upload every texture before compiling the programs', async () => {
    const calls: string[] = [];
    const renderer: WarmupRenderer = {
      initTexture: vi.fn(() => calls.push('upload')),
      compileAsync: vi.fn(async (scene: THREE.Object3D) => {
        calls.push('compile');
        return scene;
      }),
    };
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: new THREE.Texture() })));
    const camera = new THREE.PerspectiveCamera();

    await warmUpScene(renderer, scene, camera);

    expect(calls).toEqual(['upload', 'compile']);
    expect(renderer.compileAsync).toHaveBeenCalledWith(scene, camera);
  });
});
