import * as THREE from 'three';
import { OPPONENT_CARD_MESH } from '@/presentation/config/layout.config';

/** BoxGeometry group order: +x, -x, +y, -y (the thin edges), +z, -z (back faces). */
const EDGE_GROUPS = [0, 1, 2, 3] as const;
const BACK_GROUPS = [4, 5] as const;

/** A geometry drawing only some groups of `source`, sharing its vertex buffers (uploaded once). */
function geometryFromGroups(source: THREE.BufferGeometry, groups: readonly number[]): THREE.BufferGeometry {
  const sourceIndex = source.getIndex();
  if (!sourceIndex) throw new Error('geometryFromGroups needs an indexed geometry');
  const indices: number[] = [];
  for (const groupIndex of groups) {
    const group = source.groups[groupIndex];
    for (let i = group.start; i < group.start + group.count; i++) indices.push(sourceIndex.getX(i));
  }
  const part = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) part.setAttribute(name, attribute);
  part.setIndex(indices);
  return part;
}

interface OpponentCardGeometries {
  backs: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
}

let geometries: OpponentCardGeometries | null = null;
let edgeMaterial: THREE.MeshBasicMaterial | null = null;
let fallbackBackMaterial: THREE.MeshBasicMaterial | null = null;
const backMaterials = new WeakMap<THREE.Texture, THREE.MeshBasicMaterial>();

/**
 * The two parts of a face-down card, shared by every opponent hand. Module lifetime: three.js
 * re-uploads them after a context loss, and they are tiny, so they are never disposed.
 */
export function getOpponentCardGeometries(): OpponentCardGeometries {
  if (!geometries) {
    const box = new THREE.BoxGeometry(OPPONENT_CARD_MESH.WIDTH, OPPONENT_CARD_MESH.HEIGHT, OPPONENT_CARD_MESH.THICKNESS);
    geometries = { backs: geometryFromGroups(box, BACK_GROUPS), edges: geometryFromGroups(box, EDGE_GROUPS) };
  }
  return geometries;
}

export function getOpponentEdgeMaterial(): THREE.MeshBasicMaterial {
  edgeMaterial ??= new THREE.MeshBasicMaterial({ color: OPPONENT_CARD_MESH.EDGE_COLOR });
  return edgeMaterial;
}

/** One back material per card-back texture (per deck theme), shared by every hand. */
export function getOpponentBackMaterial(texture: THREE.Texture | null): THREE.MeshBasicMaterial {
  if (!texture) {
    fallbackBackMaterial ??= new THREE.MeshBasicMaterial({ color: OPPONENT_CARD_MESH.FALLBACK_BACK_COLOR });
    return fallbackBackMaterial;
  }
  let material = backMaterials.get(texture);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ map: texture });
    backMaterials.set(texture, material);
  }
  return material;
}
