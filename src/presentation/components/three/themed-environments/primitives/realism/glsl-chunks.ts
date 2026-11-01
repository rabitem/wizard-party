/**
 * Small GLSL snippets shared by the realism shaders. All of them run inside a
 * THREE.ShaderMaterial (not Raw), so three's prefix supplies the matrices,
 * cameraPosition, USE_FOG / FOG_EXP2 defines, tone mapping and colour space
 * helpers.
 */

/**
 * Fog factor from the scene fog (linear or exp2) without touching the
 * colour. Needs `#include <fog_pars_fragment>` and vFogDepth from
 * `#include <fog_vertex>` (or set manually). Evaluates to 0 without fog.
 */
export const FOG_FACTOR_GLSL = /* glsl */ `
float realismFogFactor() {
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      return 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      return smoothstep(fogNear, fogFar, vFogDepth);
    #endif
  #else
    return 0.0;
  #endif
}
`;

/** Cheap hash + value noise helpers. */
export const NOISE_GLSL = /* glsl */ `
float realismHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float realismNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(realismHash(i), realismHash(i + vec2(1.0, 0.0)), u.x),
             mix(realismHash(i + vec2(0.0, 1.0)), realismHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/** Standard output tail: tone mapping + output colour space. */
export const OUTPUT_TAIL_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
