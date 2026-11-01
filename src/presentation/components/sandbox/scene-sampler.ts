import * as THREE from 'three';
import { parseSceneObjectName, type SceneObjectKind } from '../three/scene-object-names';
import type { NdcBounds, ObjectSample, Vec3 } from './sandbox.types';

const NDC_KINDS = new Set<SceneObjectKind>(['hand-card', 'played-card']);

export function isVisibleInScene(object: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

/** Normalised-device-coordinate bounds of an object's world bounding box, or null when it is empty. */
export function projectBounds(object: THREE.Object3D, camera: THREE.Camera, box = new THREE.Box3(), corner = new THREE.Vector3()): NdcBounds | null {
  box.setFromObject(object);
  if (box.isEmpty()) return null;
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (let index = 0; index < 8; index++) {
    corner.set(
      index & 1 ? box.max.x : box.min.x,
      index & 2 ? box.max.y : box.min.y,
      index & 4 ? box.max.z : box.min.z
    ).project(camera);
    minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Every named card object (see scene-object-names) with its world, camera and screen placement. */
export function sampleSceneObjects(scene: THREE.Scene, camera: THREE.Camera): ObjectSample[] {
  const samples: ObjectSample[] = [];
  const world = new THREE.Vector3();
  const local = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();

  scene.traverse((object) => {
    if (!object.name) return;
    const parsed = parseSceneObjectName(object.name);
    if (!parsed) return;

    object.getWorldPosition(world);
    object.getWorldScale(scale);
    object.getWorldQuaternion(rotation);
    const position: Vec3 = [world.x, world.y, world.z];
    local.copy(world);
    camera.worldToLocal(local);
    const finite = position.every(Number.isFinite) && Number.isFinite(scale.x);
    samples.push({
      name: object.name,
      kind: parsed.kind,
      cardId: parsed.cardId,
      position,
      cameraPosition: [local.x, local.y, local.z],
      quaternion: [rotation.x, rotation.y, rotation.z, rotation.w],
      scale: scale.x,
      visible: isVisibleInScene(object),
      finite,
      ndc: finite && NDC_KINDS.has(parsed.kind) ? projectBounds(object, camera, box, corner) : null,
    });
  });

  return samples;
}
