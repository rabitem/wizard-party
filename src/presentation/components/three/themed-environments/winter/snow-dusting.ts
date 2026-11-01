import * as THREE from 'three';

export interface SnowDustingOptions {
  /** Snow colour (sRGB hex) */
  color?: string;
  /** 0..1 overall coverage */
  amount?: number;
  /**
   * World-normal Y where snow starts settling: 0.35 = only fairly flat tops,
   * -1 = everywhere (snowman, drifts). Patchiness comes from world noise.
   */
  threshold?: number;
  /** World-space noise frequency of the patches */
  patchScale?: number;
  /** 0..1 strength of the glints that twinkle as the camera moves */
  sparkle?: number;
  /**
   * 0..1: keep the material's own colour / roughness under the snow (1 for
   * surfaces that already are snow, e.g. a snow PBR set: only glints are added)
   */
  keepSurface?: number;
}

const DUSTING_VERTEX_PARS = /* glsl */ `
varying vec3 vSnowWorldPos;
varying vec3 vSnowWorldNormal;
`;

const DUSTING_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  mat4 snowModel = modelMatrix;
  #ifdef USE_INSTANCING
    snowModel = modelMatrix * instanceMatrix;
  #endif
  mat3 snowM = mat3(snowModel);
  // Inverse-transpose for (non-uniformly) scaled instances: divide by squared axis scale.
  vec3 snowS2 = vec3(dot(snowM[0], snowM[0]), dot(snowM[1], snowM[1]), dot(snowM[2], snowM[2]));
  vSnowWorldNormal = normalize(snowM * (objectNormal / snowS2));
  vSnowWorldPos = (snowModel * vec4(transformed, 1.0)).xyz;
}
`;

const DUSTING_FRAGMENT_PARS = /* glsl */ `
uniform vec3 uSnowColor;
uniform float uSnowAmount;
uniform float uSnowThreshold;
uniform float uSnowPatchScale;
uniform float uSnowSparkle;
uniform float uSnowKeep;
varying vec3 vSnowWorldPos;
varying vec3 vSnowWorldNormal;
float snowHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float snowNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(snowHash(i), snowHash(i + vec3(1, 0, 0)), f.x), mix(snowHash(i + vec3(0, 1, 0)), snowHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(snowHash(i + vec3(0, 0, 1)), snowHash(i + vec3(1, 0, 1)), f.x), mix(snowHash(i + vec3(0, 1, 1)), snowHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

const DUSTING_MAP_FRAGMENT = /* glsl */ `
#include <map_fragment>
float snowPatch = snowNoise(vSnowWorldPos * uSnowPatchScale) * 0.65 + snowNoise(vSnowWorldPos * uSnowPatchScale * 4.3) * 0.35;
float snowUp = vSnowWorldNormal.y + (snowPatch - 0.5) * 0.7;
float snowMask = smoothstep(uSnowThreshold, uSnowThreshold + 0.22, snowUp) * smoothstep(1.0 - uSnowAmount - 0.15, 1.0 - uSnowAmount + 0.15, snowPatch * 0.6 + 0.4 * max(vSnowWorldNormal.y, 0.0));
diffuseColor.rgb = mix(diffuseColor.rgb, mix(uSnowColor * (0.9 + snowPatch * 0.12), diffuseColor.rgb, uSnowKeep), snowMask);
`;

const DUSTING_ROUGHNESS_FRAGMENT = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(0.62, roughnessFactor, uSnowKeep), snowMask);
`;

const DUSTING_EMISSIVE_FRAGMENT = /* glsl */ `
#include <emissivemap_fragment>
{
  // Glints: tiny cells that light up for some view positions only, so they twinkle while orbiting.
  vec3 snowCell = floor(vSnowWorldPos * 70.0);
  float snowGlint = step(0.993, snowHash(snowCell + floor(cameraPosition * 3.0)));
  totalEmissiveRadiance += vec3(snowGlint * snowMask * uSnowSparkle * 1.6);
}
`;

/**
 * Settles snow on the upward-facing parts of an existing MeshStandardMaterial
 * (branches, beams, rails, drifts): world-normal mask broken up by 3D noise,
 * snow roughness and view-dependent glints that bloom slightly. Works with
 * instanced meshes. Mutates and returns the material.
 */
export function applySnowDusting<T extends THREE.MeshStandardMaterial>(material: T, options: SnowDustingOptions = {}): T {
  const uniforms = {
    uSnowColor: { value: new THREE.Color(options.color ?? '#f4f8ff') },
    uSnowAmount: { value: options.amount ?? 0.7 },
    uSnowThreshold: { value: options.threshold ?? 0.35 },
    uSnowPatchScale: { value: options.patchScale ?? 1.6 },
    uSnowSparkle: { value: options.sparkle ?? 0.6 },
    uSnowKeep: { value: options.keepSurface ?? 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DUSTING_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', DUSTING_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DUSTING_FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', DUSTING_MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', DUSTING_ROUGHNESS_FRAGMENT)
      .replace('#include <emissivemap_fragment>', DUSTING_EMISSIVE_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'winter-snow-dusting-v1';
  material.needsUpdate = true;
  return material;
}
