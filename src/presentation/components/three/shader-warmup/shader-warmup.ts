import * as THREE from 'three';
import { isReplacedMesh } from '../batching';
import { prepareSceneMaterials } from '../render-variants';

/** The renderer calls the warm-up needs (a WebGLRenderer, or a stub in tests). */
export type WarmupRenderer = Pick<THREE.WebGLRenderer, 'initTexture' | 'compileAsync' | 'getRenderTarget' | 'setRenderTarget' | 'getActiveCubeFace' | 'getActiveMipmapLevel'>;

type Drawable = THREE.Object3D & { material?: THREE.Material | THREE.Material[] };

function isTexture(value: unknown): value is THREE.Texture {
  return typeof value === 'object' && value !== null && (value as { isTexture?: unknown }).isTexture === true;
}

function isRenderTargetTexture(texture: THREE.Texture): boolean {
  return (texture as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture === true;
}

function addMaterialTextures(material: THREE.Material, out: Set<THREE.Texture>): void {
  for (const value of Object.values(material)) {
    if (isTexture(value)) out.add(value);
  }
  const uniforms = (material as THREE.ShaderMaterial).uniforms;
  if (!uniforms) return;
  for (const uniform of Object.values(uniforms)) {
    if (isTexture(uniform?.value)) out.add(uniform.value);
  }
}

/**
 * Every image texture the materials below `root` sample (maps and shader uniforms). Render
 * target textures are skipped: they are filled by rendering, not uploaded.
 */
export function collectSceneTextures(root: THREE.Object3D): Set<THREE.Texture> {
  const textures = new Set<THREE.Texture>();
  const visit = (object: THREE.Object3D) => {
    if (isReplacedMesh(object)) return;
    const { material } = object as Drawable;
    if (material) for (const entry of Array.isArray(material) ? material : [material]) addMaterialTextures(entry, textures);
    object.children.forEach(visit);
  };
  visit(root);
  for (const texture of textures) {
    if (isRenderTargetTexture(texture)) textures.delete(texture);
  }
  return textures;
}

/**
 * Uploads every texture and compiles every shader program the scene needs, before they are first
 * drawn. three.js otherwise does both synchronously on first use, which costs 10-20 ms hitches in
 * the middle of the first deal or trick. compileAsync uses KHR_parallel_shader_compile where
 * available, so the main thread is not blocked while the driver links. Objects hidden with
 * visible=false are compiled too.
 */
export async function warmUpScene(renderer: WarmupRenderer, scene: THREE.Scene, camera: THREE.Camera, target: THREE.WebGLRenderTarget | null = null): Promise<void> {
  prepareSceneMaterials(scene);
  for (const texture of collectSceneTextures(scene)) renderer.initTexture(texture);
  const view = new THREE.Group();
  const visit = (object: THREE.Object3D) => {
    if (isReplacedMesh(object)) return;
    if ((object as Drawable).material) {
      const mesh = object as THREE.Mesh;
      // Text subclasses derive their material lazily; cloning the subclass creates another
      // derivation instead of compiling the exact material its next draw will use.
      const copy = mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh
        ? new THREE.Mesh(mesh.geometry, mesh.material) : object.clone(false);
      view.add(copy);
    }
    object.children.forEach(visit);
  };
  visit(scene);
  // compileAsync selects its output transfer function synchronously from the current target.
  // Restore immediately: frames must keep rendering while the parallel compiler finishes.
  const previous = renderer.getRenderTarget();
  const face = renderer.getActiveCubeFace();
  const level = renderer.getActiveMipmapLevel();
  let compilation: ReturnType<WarmupRenderer['compileAsync']>;
  try {
    renderer.setRenderTarget(target);
    compilation = renderer.compileAsync(view, camera, scene);
  } finally {
    renderer.setRenderTarget(previous, face, level);
  }
  await compilation;
}
