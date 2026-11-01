import { NOISE_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * Incense smoke: a quad that turns around world up to face the camera; the
 * fragment shader draws two thin filaments that rise, curl, widen and break
 * into wisps before fading out. Animated by one time uniform.
 */

export const SMOKE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCamera = cameraPosition - center;
  vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(1e-4, 0.0, 0.0));
  vec3 world = center + right * position.x + vec3(0.0, position.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const SMOKE_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;

${NOISE_GLSL}

float filament(vec2 uv, float seed) {
  float h = uv.y;
  float n1 = realismNoise(vec2(h * 3.0 - uTime * 0.55, uTime * 0.12 + seed));
  float n2 = realismNoise(vec2(h * 7.0 - uTime * 1.05, seed * 1.7 + 3.1));
  float center = 0.5 + ((n1 - 0.5) * 0.55 + (n2 - 0.5) * 0.18) * h + sin(h * 6.0 - uTime * 1.3 + seed) * 0.06 * h;
  float width = mix(0.012, 0.2, pow(h, 1.3));
  float strand = 1.0 - smoothstep(width * 0.3, width, abs(uv.x - center));
  float breakup = realismNoise(vec2(uv.x * 9.0 + seed, h * 5.0 - uTime * 0.9));
  return strand * mix(1.0, smoothstep(0.25, 0.75, breakup), smoothstep(0.15, 0.6, h));
}

void main() {
  float h = vUv.y;
  float smoke = max(filament(vUv, 0.0), filament(vUv + vec2(0.04, 0.0), 4.3) * 0.7);
  float fade = smoothstep(0.0, 0.04, h) * (1.0 - smoothstep(0.5, 1.0, h));
  float alpha = smoke * fade * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`;
