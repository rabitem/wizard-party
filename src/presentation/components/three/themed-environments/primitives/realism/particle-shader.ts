import { FOG_FACTOR_GLSL, OUTPUT_TAIL_GLSL } from './glsl-chunks';

/**
 * GPU particle shader. Every particle's motion is a pure function of uTime,
 * its spawn position and its seeds, so the CPU only updates a handful of
 * uniforms per frame:
 *
 * - terminal-velocity fall (uFallSpeed * layer speed * per-particle jitter)
 * - wind drift integrated on the CPU into uWindOffset (smooth gusts)
 * - lateral sway + a curl-like flow field built from offset sines
 * - wrap-around inside the volume (mod) with soft edge fades hiding the pop
 * - perspective size attenuation, defocus blur for particles closer than
 *   the focus distance, velocity-aligned rain streaks, flicker, height cool-down (embers), keep-clear zone
 *   around the table and fog fade.
 */
export const PARTICLE_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform vec3 uBoxSize;
uniform float uFallSpeed;
uniform float uSway;
uniform float uSwayFrequency;
uniform float uTurbulence;
uniform vec3 uWindOffset;
uniform float uGust;
uniform float uSpin;
uniform float uFlip;
uniform float uFlicker;
uniform float uHeightFade;
uniform float uStreak;
uniform vec3 uVelocity;
uniform float uRotationJitter;
uniform float uViewportHeight;
uniform float uMaxPointSize;
uniform float uFocusDistance;
uniform float uEdgeFade;
uniform vec2 uNearFade;
uniform vec2 uClearCenter;
uniform float uClearRadius;
uniform float uClearFeather;
uniform float uSizeScale;
uniform float uOpacity;

attribute vec4 aSeed;
attribute vec4 aShape;
attribute vec3 aColor;

varying vec4 vColor;
varying float vBlur;
varying vec2 vRotation;
varying float vSquash;

#include <fog_pars_vertex>

vec3 flowField(vec3 q, float t) {
  return vec3(
    sin(q.y * 1.7 + t * 0.63) + sin(q.z * 1.1 - t * 0.41),
    sin(q.x * 1.3 - t * 0.37) * 0.35 + sin(q.z * 0.7 + t * 0.29) * 0.25,
    cos(q.y * 1.4 - t * 0.53) + sin(q.x * 0.9 + t * 0.47)
  ) * 0.5;
}

void main() {
  float t = uTime;
  float phase = aSeed.z * 6.2831853;
  float speed = uFallSpeed * aShape.z * mix(0.8, 1.2, aSeed.x);

  vec3 p = position * uBoxSize;
  p.y -= t * speed;
  p += uWindOffset * aShape.z * mix(0.85, 1.15, aSeed.y);
  p = mod(p, uBoxSize);
  vec3 norm = p / uBoxSize;

  float gust = 1.0 + uGust * 0.8;
  p.x += sin(t * uSwayFrequency + phase) * uSway * gust;
  p.z += cos(t * uSwayFrequency * 0.73 + phase * 1.3) * uSway * gust * 0.6;
  p += flowField(p * 0.6 + aSeed.w * 10.0, t) * uTurbulence * (0.6 + uGust * 0.6);

  vec3 local = p - uBoxSize * vec3(0.5, 0.0, 0.5);
  vec4 world = modelMatrix * vec4(local, 1.0);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  float depth = max(-mvPosition.z, 0.05);

  vBlur = aShape.w * (1.0 - smoothstep(uFocusDistance * 0.35, uFocusDistance, depth));
  float pixels = aShape.x * uSizeScale * projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  gl_PointSize = min(pixels * (1.0 + vBlur * 0.6), uMaxPointSize);

  vec3 edgeLow = smoothstep(vec3(0.0), vec3(uEdgeFade), norm);
  vec3 edgeHigh = 1.0 - smoothstep(vec3(1.0 - uEdgeFade), vec3(1.0), norm);
  float edge = edgeLow.x * edgeLow.y * edgeLow.z * edgeHigh.x * edgeHigh.y * edgeHigh.z;
  float nearFade = smoothstep(uNearFade.x, uNearFade.y, depth);
  float clearZone = uClearRadius > 0.0
    ? smoothstep(uClearRadius, uClearRadius + uClearFeather, distance(world.xz, uClearCenter))
    : 1.0;
  // Sub-pixel sprites shimmer: fade them instead of rendering noise.
  float pixelFade = smoothstep(0.6, 1.6, pixels);

  float flick = 0.15 + 0.85 * pow(max(sin(t * (1.6 + aSeed.x * 2.8) + phase), 0.0), 2.0)
    * (0.75 + 0.25 * sin(t * 13.0 + phase * 3.0));
  float alpha = aShape.y * uOpacity * edge * nearFade * clearZone * pixelFade;
  alpha *= mix(1.0, flick, uFlicker);
  alpha *= 1.0 - vBlur * 0.45;
  alpha *= mix(1.0, 1.0 - norm.y, uHeightFade);

  vec3 rgb = aColor;
  rgb = mix(rgb, rgb * vec3(1.0, 0.45, 0.22), norm.y * uHeightFade);
  vColor = vec4(rgb, alpha);

  float angle = phase * uRotationJitter + t * uSpin * (aSeed.x - 0.5) * 2.0;
  if (uStreak > 0.0) {
    // Align streaks with the screen-space direction of travel (point coords: y down).
    vec2 screenVelocity = (viewMatrix * vec4(uVelocity, 0.0)).xy;
    angle = atan(screenVelocity.x, -screenVelocity.y);
  }
  vRotation = vec2(cos(angle), sin(angle));
  vSquash = uFlip > 0.0 ? max(abs(cos(t * uFlip * mix(0.6, 1.4, aSeed.y) + phase)), 0.12) : 1.0;

  #include <fog_vertex>
}
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uMap;

varying vec4 vColor;
varying float vBlur;
varying vec2 vRotation;
varying float vSquash;

#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  uv = vec2(vRotation.x * uv.x - vRotation.y * uv.y, vRotation.y * uv.x + vRotation.x * uv.y);
  uv.x /= vSquash;
  if (abs(uv.x) > 0.5 || abs(uv.y) > 0.5) discard;

  vec4 tex = texture2D(uMap, uv + 0.5);
  float radius = length(uv) * 2.0;
  float soft = 1.0 - smoothstep(0.0, 1.0, radius);
  soft *= soft;
  float shapeAlpha = mix(tex.a, soft * 0.85, vBlur);
  vec3 rgb = vColor.rgb * mix(tex.rgb, vec3(1.0), vBlur);
  float alpha = vColor.a * shapeAlpha;

  float fogFactor = realismFogFactor();
  #ifdef ADDITIVE
    alpha *= 1.0 - fogFactor;
  #else
    #ifdef USE_FOG
      rgb = mix(rgb, fogColor, fogFactor);
    #endif
    alpha *= 1.0 - fogFactor * 0.7;
  #endif

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(rgb, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;
