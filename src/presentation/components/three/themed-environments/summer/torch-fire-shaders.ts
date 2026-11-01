import { NOISE_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * Tiki torch fire: an instanced, camera-facing (around world up) flame quad
 * with a noise-driven teardrop shape, and GPU embers that rise from each
 * torch, cool from yellow to red and fade. Both are additive and bright
 * enough (> 1) for the room's bloom.
 */

export const FLAME_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying float vPhase;

void main() {
  vUv = uv;
  mat4 instance = mat4(1.0);
  #ifdef USE_INSTANCING
    instance = instanceMatrix;
  #endif
  vec3 center = (modelMatrix * instance * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCamera = cameraPosition - center;
  vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(1e-4, 0.0, 0.0));
  vec3 world = center + right * position.x + vec3(0.0, position.y, 0.0);
  vPhase = center.x * 1.37 + center.z * 0.71;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const FLAME_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uMid;
uniform vec3 uEdge;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
varying float vPhase;

${NOISE_GLSL}

void main() {
  float h = vUv.y;
  float n1 = realismNoise(vec2(vUv.x * 3.0 + vPhase, h * 4.0 - uTime * 3.4));
  float n2 = realismNoise(vec2(vUv.x * 7.0 - vPhase, h * 9.0 - uTime * 5.2));
  float wobble = ((n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.14) * h;
  float x = abs((vUv.x - 0.5 + wobble) * 2.0);

  // Teardrop: round base, licking tip whose height flickers with the noise.
  float width = 2.3 * sqrt(clamp(h, 0.0, 1.0)) * pow(1.0 - clamp(h, 0.0, 1.0), 1.1);
  float tip = 0.78 + (n1 - 0.5) * 0.3;
  float shape = (1.0 - smoothstep(width * 0.55, width, x)) * (1.0 - smoothstep(tip - 0.2, tip, h));
  float core = (1.0 - smoothstep(0.0, width * 0.5, x)) * (1.0 - smoothstep(0.15, 0.55, h));

  vec3 color = mix(uEdge, uMid, smoothstep(0.0, 0.6, shape));
  color = mix(color, uCore, core);
  float brightness = uIntensity * (0.6 + core * 0.9);
  gl_FragColor = vec4(color * brightness, shape);
  #include <colorspace_fragment>
}
`;

export const EMBER_VERTEX_SHADER = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uRise;
uniform float uRate;
uniform float uSize;
uniform float uViewportHeight;
uniform float uMaxPointSize;
varying float vAlpha;
varying float vHeat;

void main() {
  float life = fract(uTime * uRate * (0.7 + aSeed.x * 0.6) + aSeed.y);
  vec3 p = position;
  float swirl = uTime * (1.2 + aSeed.w) + aSeed.y * 20.0;
  p.y += life * uRise * (0.7 + aSeed.z * 0.6);
  p.x += ((aSeed.z - 0.5) * 0.9 + sin(swirl) * 0.14) * life;
  p.z += ((aSeed.w - 0.5) * 0.9 + cos(swirl * 0.8) * 0.14) * life;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float size = uSize * (0.6 + aSeed.x * 0.8) * (1.0 - life * 0.55);
  gl_PointSize = min(size * projectionMatrix[1][1] * uViewportHeight * 0.5 / max(-mvPosition.z, 0.1), uMaxPointSize);

  float flicker = 0.7 + 0.3 * sin(uTime * 14.0 + aSeed.y * 40.0);
  vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.5, 1.0, life)) * flicker;
  vHeat = 1.0 - life;
}
`;

export const EMBER_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uSprite;
uniform vec3 uHot;
uniform vec3 uCool;
varying float vAlpha;
varying float vHeat;

void main() {
  float alpha = texture2D(uSprite, gl_PointCoord).a * vAlpha;
  if (alpha < 0.01) discard;
  vec3 color = mix(uCool, uHot, vHeat) * (1.0 + vHeat * 1.5);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;
