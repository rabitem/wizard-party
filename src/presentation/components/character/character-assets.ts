import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { CHARACTER_ASSETS } from '@/presentation/config/character.config';

/**
 * The two character files, loaded once per page and shared by every figure and portrait. three's
 * loaders are imported on first use, so pages that never show a character never load them.
 */
let model: Promise<GLTF> | null = null;
let animations: Promise<GLTF> | null = null;

async function load(url: string): Promise<GLTF> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(url);
}

/** The rig with every part. A failed load is forgotten, so the next caller retries. */
export function loadCharacterModel(): Promise<GLTF> {
  model ??= load(CHARACTER_ASSETS.MODEL_URL).catch((error: unknown) => {
    model = null;
    throw error;
  });
  return model;
}

/** The clips; only figures that move need them, portraits do not. */
export function loadCharacterAnimations(): Promise<GLTF> {
  animations ??= load(CHARACTER_ASSETS.ANIMATIONS_URL).catch((error: unknown) => {
    animations = null;
    throw error;
  });
  return animations;
}
