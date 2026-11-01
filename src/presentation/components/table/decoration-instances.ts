import * as THREE from 'three';
import type { DecorationPlacement } from './decoration-layout';

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();

/** Writes each placement's starting transform into an instance matrix buffer and flags the upload. */
export function writePlacementMatrices(
  placements: readonly DecorationPlacement[],
  target: THREE.InstancedBufferAttribute,
): void {
  const array = target.array as Float32Array;
  placements.forEach(({ position, rotation }, i) => {
    _position.fromArray(position);
    _quaternion.setFromEuler(_euler.fromArray(rotation));
    _matrix.compose(_position, _quaternion, _scale).toArray(array, i * 16);
  });
  target.needsUpdate = true;
}
