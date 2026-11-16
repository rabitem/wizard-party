import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { collectSceneTextures, warmUpScene, type WarmupRenderer } from './shader-warmup';
import { markReplacedMesh, restoreReplacedMesh } from '../batching';

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

  it('keeps textures for future hidden effects but does not upload replaced bake sources', () => {
    const unused = new THREE.Texture();
    const future = new THREE.Texture();
    const original = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: unused }));
    const effect = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: future }));
    original.visible = effect.visible = false;
    markReplacedMesh(original);
    const scene = new THREE.Scene();
    scene.add(original, effect);
    expect(collectSceneTextures(scene)).toEqual(new Set([future]));
    restoreReplacedMesh(original);
    expect(collectSceneTextures(scene)).toEqual(new Set([unused, future]));
  });

  it('should skip render target textures', () => {
    const target = new THREE.WebGLRenderTarget(4, 4);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: target.texture })));
    expect(collectSceneTextures(scene).size).toBe(0);
  });
});

describe('warmUpScene', () => {
  it('compiles for the composer target and immediately restores the in-flight frame target', async () => {
    const previous = new THREE.WebGLRenderTarget(8, 8);
    const composer = new THREE.WebGLRenderTarget(16, 16);
    let current: ReturnType<WarmupRenderer['getRenderTarget']> = previous;
    let compiledFor: ReturnType<WarmupRenderer['getRenderTarget']> = null;
    let restoredFace = -1;
    let restoredLevel = -1;
    let finish!: (scene: THREE.Object3D) => void;
    const renderer: WarmupRenderer = {
      initTexture: () => undefined,
      getRenderTarget: () => current,
      setRenderTarget: (target, face = 0, level = 0) => {
        current = target as ReturnType<WarmupRenderer['getRenderTarget']>;
        restoredFace = face;
        restoredLevel = level;
      },
      getActiveCubeFace: () => 3,
      getActiveMipmapLevel: () => 2,
      compileAsync: () => {
        compiledFor = current;
        return new Promise(resolve => { finish = resolve; });
      },
    };
    const scene = new THREE.Scene();
    const compilation = warmUpScene(renderer, scene, new THREE.PerspectiveCamera(), composer);
    expect(compiledFor).toBe(composer);
    expect(current).toBe(previous);
    expect([restoredFace, restoredLevel]).toEqual([3, 2]);
    finish(scene);
    await compilation;
    expect(current).toBe(previous);
  });

  it('should upload every texture and compile the exact derived text material', async () => {
    const calls: string[] = [];
    const { Text } = await vi.importActual<{ Text: new () => THREE.Mesh & { dispose(): void } }>('troika-three-text');
    const text = new Text();
    text.visible = false;
    const material = text.material;
    const renderer: WarmupRenderer = {
      getRenderTarget: () => null,
      setRenderTarget: () => undefined,
      getActiveCubeFace: () => 0,
      getActiveMipmapLevel: () => 0,
      initTexture: vi.fn(() => calls.push('upload')),
      compileAsync: vi.fn(async (scene: THREE.Object3D) => {
        calls.push('compile');
        expect((scene.children[1] as THREE.Mesh).material).toBe(material);
        return scene;
      }),
    };
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: new THREE.Texture() })));
    scene.add(text);
    const camera = new THREE.PerspectiveCamera();

    await warmUpScene(renderer, scene, camera);

    expect(calls).toEqual(['upload', 'compile']);
    expect(text.visible).toBe(false);
    text.dispose();
  });
});
