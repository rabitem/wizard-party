import * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';

/** One placed copy of a repeated prop. */
export interface PropPlacement {
  position: Vec3;
  /** Uniform scale or per-axis scale */
  scale?: number | Vec3;
  rotationY?: number;
  /** Optional tilt around X/Z (radians) for a less regimented look */
  tilt?: [number, number];
  /** Optional per-instance tint (needs a white base material colour) */
  color?: string;
}

const scratchObject = new THREE.Object3D();
const scratchMatrix = new THREE.Matrix4();
const scratchColor = new THREE.Color();

/** Matrix for a placement (position, rotation, scale). */
export function placementMatrix(placement: PropPlacement, target = new THREE.Matrix4()): THREE.Matrix4 {
  const [x, y, z] = placement.position;
  const scale = placement.scale ?? 1;
  const [tiltX, tiltZ] = placement.tilt ?? [0, 0];
  scratchObject.position.set(x, y, z);
  scratchObject.rotation.set(tiltX, placement.rotationY ?? 0, tiltZ);
  if (typeof scale === 'number') scratchObject.scale.setScalar(scale);
  else scratchObject.scale.set(scale[0], scale[1], scale[2]);
  scratchObject.updateMatrix();
  return target.copy(scratchObject.matrix);
}

/** Builds a local offset matrix for a sub-part of an instanced prop. */
export function localMatrix(position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): THREE.Matrix4 {
  scratchObject.position.set(...position);
  scratchObject.rotation.set(...rotation);
  scratchObject.scale.set(...scale);
  scratchObject.updateMatrix();
  return scratchObject.matrix.clone();
}

/**
 * Writes placement matrices (optionally composed with a local offset) and
 * colours into an InstancedMesh, then refreshes its culling bounds.
 */
export function writeInstances(
  mesh: THREE.InstancedMesh | null,
  placements: readonly PropPlacement[],
  offset?: THREE.Matrix4,
): void {
  if (!mesh) return;
  placements.forEach((placement, index) => {
    placementMatrix(placement, scratchMatrix);
    if (offset) scratchMatrix.multiply(offset);
    mesh.setMatrixAt(index, scratchMatrix);
    if (placement.color) mesh.setColorAt(index, scratchColor.set(placement.color));
  });
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Deterministic pseudo-random generator so layouts are stable across renders. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
