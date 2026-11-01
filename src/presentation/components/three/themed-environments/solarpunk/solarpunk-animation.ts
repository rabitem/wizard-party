import type * as THREE from 'three';

/**
 * Per-frame writes to memoised GPU resources, kept out of the components so
 * frame callbacks stay declarative (same pattern as useFlicker).
 */

/** Writes the clock into a shared time uniform (sway, water, caustics). */
export function setTimeUniform(uniform: THREE.IUniform<number>, time: number): void {
  uniform.value = time;
}
