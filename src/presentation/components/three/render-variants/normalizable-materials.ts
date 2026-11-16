import type * as THREE from 'three';

const known = new WeakSet<THREE.Material>();
/** Opt in patches that preserve the built-in map, colour and normal semantics. */
export function allowMaterialNormalization(material: THREE.Material): void { known.add(material); }
export function isKnownMaterialPatch(material: THREE.Material): boolean { return known.has(material); }
