import type * as THREE from 'three';

type Uniforms = Record<string, THREE.IUniform>;

/**
 * Uniforms of the ShaderMaterial on a mesh/points ref (null before mount).
 * Frame loops update uniforms through this instead of touching memoised
 * materials directly, which the React compiler lint rejects.
 */
export function shaderUniforms<T extends Uniforms = Uniforms>(object: THREE.Object3D | null | undefined): T | null {
  const material = (object as THREE.Mesh | null | undefined)?.material as THREE.ShaderMaterial | undefined;
  return material?.uniforms ? (material.uniforms as T) : null;
}
