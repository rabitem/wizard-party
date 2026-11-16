import type { Object3D } from 'three';

const replaced = new WeakSet<Object3D>();

/** Source geometry stays React-owned but is drawn by its baked replacement. */
export function markReplacedMesh(object: Object3D): void { replaced.add(object); }
export function restoreReplacedMesh(object: Object3D): void { replaced.delete(object); }
export function isReplacedMesh(object: Object3D): boolean { return replaced.has(object); }
