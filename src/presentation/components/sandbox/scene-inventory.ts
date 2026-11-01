import * as THREE from 'three';
import { parseSceneObjectName, type SceneObjectKind } from '../three/scene-object-names';
import { isVisibleInScene } from './scene-sampler';
import type { RendererState, SceneFacts, SceneInventory } from './sandbox-report.types';

/** troika-three-text meshes, recognised by shape so the sandbox does not import troika. */
export interface TextLike extends THREE.Mesh {
  text: string;
  fontSize: number;
}

export function isSceneText(object: THREE.Object3D): object is TextLike {
  const candidate = object as Partial<TextLike>;
  return (object as THREE.Mesh).isMesh === true && typeof candidate.text === 'string' && typeof candidate.fontSize === 'number';
}

function isPunctualLight(object: THREE.Object3D): object is THREE.Light {
  const light = object as THREE.Light & { isPointLight?: boolean; isSpotLight?: boolean; isDirectionalLight?: boolean };
  return light.isLight === true && (light.isPointLight === true || light.isSpotLight === true || light.isDirectionalLight === true);
}

function materialsOf(object: THREE.Object3D): THREE.Material[] {
  const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

/** What draws and what lights the scene right now (visible objects only). */
export function takeSceneInventory(scene: THREE.Scene): SceneInventory {
  const materials = new Set<THREE.Material>();
  const inventory: SceneInventory = { meshes: 0, instancedMeshes: 0, materials: 0, lights: 0, shadowCastingLights: 0, points: 0, texts: 0 };
  scene.traverseVisible((object) => {
    if (isPunctualLight(object)) {
      inventory.lights++;
      if (object.castShadow) inventory.shadowCastingLights++;
      return;
    }
    if ((object as THREE.Points).isPoints) inventory.points++;
    if ((object as THREE.InstancedMesh).isInstancedMesh) inventory.instancedMeshes++;
    else if ((object as THREE.Mesh).isMesh) inventory.meshes++;
    if (isSceneText(object)) inventory.texts++;
    for (const material of materialsOf(object)) materials.add(material);
  });
  inventory.materials = materials.size;
  return inventory;
}

export function rendererState(renderer: THREE.WebGLRenderer): RendererState {
  return {
    toneMapping: renderer.toneMapping,
    outputColorSpace: String(renderer.outputColorSpace),
    shadowMapEnabled: renderer.shadowMap.enabled,
    shadowMapType: renderer.shadowMap.type,
    pixelRatio: renderer.getPixelRatio(),
  };
}

/** Camera, card counts per owner, renderer state and inventory: a pixel-free fingerprint of a frame. */
export function takeSceneFacts(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): SceneFacts {
  const objects: Partial<Record<SceneObjectKind, number>> = {};
  scene.traverse((object) => {
    const parsed = object.name ? parseSceneObjectName(object.name) : null;
    if (parsed && isVisibleInScene(object)) objects[parsed.kind] = (objects[parsed.kind] ?? 0) + 1;
  });
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    camera: {
      position: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
      fov: (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? round((camera as THREE.PerspectiveCamera).fov) : null,
    },
    objects,
    renderer: rendererState(renderer),
    inventory: takeSceneInventory(scene),
  };
}
