import * as THREE from 'three';
import { parseSceneObjectName } from '../three/scene-object-names';

/** Estimated draw calls of one group of visible objects (one per material group, instanced meshes count once). */
export interface DrawBreakdownEntry {
  owner: string;
  meshes: number;
  drawCalls: number;
  shadowCasters: number;
  shadowDrawCalls: number;
}

function drawCallsOf(mesh: THREE.Mesh): number {
  const groups = mesh.geometry?.groups.length ?? 0;
  return Array.isArray(mesh.material) ? Math.max(1, groups) : 1;
}

/** The first ancestor that names what the object belongs to (a card id kind, a named prop), else its type. */
function ownerOf(object: THREE.Object3D): string {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    const parsed = current.name ? parseSceneObjectName(current.name) : null;
    if (parsed) return parsed.kind;
    if (current.name) return current.name;
  }
  const mesh = object as THREE.Mesh;
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return `${mesh.geometry?.type ?? object.type}/${material?.type ?? '?'}`;
}

/**
 * Where the draw calls of the frame come from, biggest first: an estimate from the scene graph
 * (frustum culling ignored), so a change can be aimed at the owners that cost the most.
 */
export function takeDrawBreakdown(scene: THREE.Scene): DrawBreakdownEntry[] {
  const byOwner = new Map<string, DrawBreakdownEntry>();
  scene.traverseVisible((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh && !(object as THREE.Points).isPoints && !(object as THREE.Line).isLine) return;
    const owner = ownerOf(object);
    const entry = byOwner.get(owner) ?? { owner, meshes: 0, drawCalls: 0, shadowCasters: 0, shadowDrawCalls: 0 };
    const calls = mesh.isMesh ? drawCallsOf(mesh) : 1;
    entry.meshes++;
    entry.drawCalls += calls;
    if (object.castShadow) {
      entry.shadowCasters++;
      entry.shadowDrawCalls += calls;
    }
    byOwner.set(owner, entry);
  });
  return [...byOwner.values()].sort((a, b) => b.drawCalls - a.drawCalls);
}
