import { FOG_FACTOR_GLSL, OUTPUT_TAIL_GLSL } from './glsl-chunks';

/** Ground fog: stacked planes sampling a scrolling tileable noise (aLayer 0 = lowest). */
export const GROUND_FOG_VERTEX_SHADER = /* glsl */ `
attribute float aLayer;
varying vec2 vUv;
varying float vLayer;
varying float vViewDepth;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLayer = aLayer;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const GROUND_FOG_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uScale;
uniform float uLayers;
uniform vec2 uNearFade;
varying vec2 vUv;
varying float vLayer;
varying float vViewDepth;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}
void main() {
  float drift = uTime * (1.0 + vLayer * 0.35);
  vec2 uvA = vUv * uScale + vec2(drift * 0.9, drift * 0.55) + vLayer * 0.37;
  vec2 uvB = vUv * uScale * 2.3 - vec2(drift * 0.6, -drift * 0.8) + vLayer * 0.71;
  float n = texture2D(uNoise, uvA).r * 0.65 + texture2D(uNoise, uvB).r * 0.35;
  float density = smoothstep(0.32, 0.78, n);
  float edge = 1.0 - smoothstep(0.28, 0.5, length(vUv - 0.5));
  float layerFade = 1.0 - vLayer / max(uLayers, 1.0);
  float nearFade = smoothstep(uNearFade.x, uNearFade.y, vViewDepth);
  float alpha = uOpacity * density * edge * layerFade * nearFade;
  float fogFactor = realismFogFactor();
  vec3 rgb = uColor;
  #ifdef USE_FOG
    rgb = mix(rgb, fogColor, fogFactor);
  #endif
  alpha *= 1.0 - fogFactor * 0.5;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(rgb, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;

/** Light shafts: additive open cones, soft at silhouette edges, faded along the beam. */
export const LIGHT_SHAFT_VERTEX_SHADER = /* glsl */ `
attribute float aAlong;
varying float vAlong;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec2 vNoiseUv;
#include <fog_pars_vertex>
void main() {
  vAlong = aAlong;
  vNoiseUv = vec2(uv.x * 3.0, aAlong * 1.5);
  vViewNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const LIGHT_SHAFT_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uEdgeSoftness;
uniform sampler2D uNoise;
varying float vAlong;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec2 vNoiseUv;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}
void main() {
  // Silhouette edges (normal perpendicular to the view ray) fade out: reads as a soft volume.
  float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPosition)));
  float edge = pow(facing, uEdgeSoftness);
  float along = smoothstep(0.0, 0.12, vAlong) * (1.0 - smoothstep(0.45, 1.0, vAlong));
  float shimmer = 0.7 + 0.6 * texture2D(uNoise, vNoiseUv + vec2(0.0, -uTime)).r;
  float nearFade = smoothstep(0.5, 2.5, -vViewPosition.z);
  float alpha = uIntensity * edge * along * shimmer * nearFade * (1.0 - realismFogFactor());
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(uColor * alpha, 1.0);
  ${OUTPUT_TAIL_GLSL}
}
`;
