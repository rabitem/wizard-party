import { FOG_FACTOR_GLSL, OUTPUT_TAIL_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * Fountain droplets, fully GPU-driven: every point follows a ballistic arc
 * computed from its seed and the time uniform. aKind picks the emitter:
 * 0 = top jet, 1 = drips off the bowl rim, 2 = splashes on the basin.
 * All positions are in the fountain group's local space.
 */
export const SPRAY_VERTEX_SHADER = /* glsl */ `
attribute vec4 aSeed;
attribute float aKind;
uniform float uTime;
uniform float uGravity;
uniform float uJetY;
uniform vec2 uRim;
uniform float uBasinY;
uniform float uSplashRadius;
uniform float uSize;
uniform float uViewportHeight;
uniform float uMaxPointSize;
varying float vFade;
#include <fog_pars_vertex>

void main() {
  vec2 dir = vec2(cos(aSeed.y * 6.2832), sin(aSeed.y * 6.2832));
  float duration;
  vec3 p;
  if (aKind < 0.5) {
    duration = 0.5 + aSeed.w * 0.12;
    float t = fract(uTime / duration + aSeed.x) * duration;
    float vy = 1.45 + aSeed.w * 0.45;
    float hs = 0.22 + aSeed.z * 0.32;
    p = vec3(dir.x * hs * t, uJetY + vy * t - 0.5 * uGravity * t * t, dir.y * hs * t);
    vFade = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(duration * 0.8, duration, t));
  } else if (aKind < 1.5) {
    float fall = uRim.y - uBasinY;
    duration = sqrt(2.0 * fall / uGravity);
    float t = fract(uTime / duration + aSeed.x) * duration;
    float r = uRim.x + (0.08 + aSeed.z * 0.1) * t / duration;
    p = vec3(dir.x * r, uRim.y - 0.5 * uGravity * t * t, dir.y * r);
    vFade = smoothstep(0.0, 0.1, t / duration) * (1.0 - smoothstep(0.9, 1.0, t / duration));
  } else {
    duration = 0.28 + aSeed.w * 0.1;
    float t = fract(uTime / duration + aSeed.x) * duration;
    float vy = 0.55 + aSeed.z * 0.45;
    float r = uSplashRadius + (aSeed.w - 0.3) * 0.18 + 0.25 * t;
    p = vec3(dir.x * r, uBasinY + max(0.0, vy * t - 0.5 * uGravity * t * t), dir.y * r);
    vFade = 1.0 - smoothstep(0.5, 1.0, t / duration);
  }
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float size = uSize * (0.6 + aSeed.z * 0.6);
  gl_PointSize = min(size * projectionMatrix[1][1] * 0.5 * uViewportHeight / max(-mvPosition.z, 0.1), uMaxPointSize);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const SPRAY_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float body = 1.0 - smoothstep(0.25, 0.5, d);
  float glint = 1.0 - smoothstep(0.0, 0.14, length(c + vec2(0.12, 0.12)));
  vec3 rgb = uColor * (0.85 + glint * 0.9);
  float alpha = body * vFade * uOpacity;
  #ifdef USE_FOG
    rgb = mix(rgb, fogColor, realismFogFactor());
  #endif
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(rgb, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;
