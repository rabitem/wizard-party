import type * as THREE from 'three';
import type { ObjectSample } from 'three-motion-audit';
import { projectBounds, sampleScene } from 'three-motion-audit/three';
import { parseSceneObjectName, type SceneObjectKind } from '../three/scene-object-names';
import { CAMERA_TRACK } from './card-motion-audit';

/** Kinds whose place on screen is judged: the hand's motion, and played cards coming to rest off screen. */
const SCREEN_KINDS = new Set<SceneObjectKind>(['hand-card', 'played-card']);

/**
 * Every named card object (see scene-object-names) and the camera, as motion-audit samples: the
 * object name is the id, the card id the entity and the object kind the role.
 */
export function sampleSceneObjects(scene: THREE.Scene, camera: THREE.Camera): ObjectSample[] {
  const projected = new Map<string, THREE.Object3D>();
  const samples = sampleScene(scene, camera, {
    // Projection costs a bounding box per object; only the kinds judged on screen pay it.
    screen: false,
    camera: CAMERA_TRACK,
    select: (object) => {
      const parsed = object.name ? parseSceneObjectName(object.name) : null;
      if (!parsed) return null;
      if (SCREEN_KINDS.has(parsed.kind)) projected.set(object.name, object);
      return { id: object.name, entity: parsed.cardId, role: parsed.kind };
    },
  });
  for (const sample of samples) {
    const object = projected.get(sample.id);
    if (object && sample.position.every(Number.isFinite)) sample.screen = projectBounds(object, camera);
  }
  return samples;
}
