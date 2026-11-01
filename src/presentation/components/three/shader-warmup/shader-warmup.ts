import type * as THREE from 'three';

/** The renderer calls the warm-up needs (a WebGLRenderer, or a stub in tests). */
export type WarmupRenderer = Pick<THREE.WebGLRenderer, 'initTexture' | 'compileAsync'>;

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
  root.traverse((object) => {
    const { material } = object as Drawable;
    if (!material) return;
    for (const entry of Array.isArray(material) ? material : [material]) addMaterialTextures(entry, textures);
  });
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
export async function warmUpScene(renderer: WarmupRenderer, scene: THREE.Object3D, camera: THREE.Camera): Promise<void> {
  for (const texture of collectSceneTextures(scene)) renderer.initTexture(texture);
  await renderer.compileAsync(scene, camera);
}
