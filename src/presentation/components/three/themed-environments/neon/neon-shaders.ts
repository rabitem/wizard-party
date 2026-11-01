import { NOISE_GLSL, OUTPUT_TAIL_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * Neon rooftop shaders (all THREE.ShaderMaterial, so three supplies the
 * matrices, cameraPosition, tone mapping and colour space chunks):
 *
 * - RIPPLE: splash rings on the wet deck. The deck is split into cells; each
 *   active cell spawns one expanding double ring per cycle at a fresh random
 *   spot, so the fragment shader only ever evaluates its own cell.
 * - STEAM: camera-facing puffs rising from the roof vents (instanced quads,
 *   age = fract(time / lifetime + seed)), wispy through the shared fog noise.
 * - AIRCRAFT: points for blinking tower beacons and planes crossing the sky
 *   (strobe + red/green nav lights), position and blink fully on the GPU.
 */

export const RIPPLE_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorld;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const RIPPLE_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform float uCell;
uniform float uRate;
uniform float uDensity;
uniform float uMaxRadius;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uClearRadius;
uniform vec2 uFadeDistance;
uniform float uHalfSize;

varying vec3 vWorld;

${NOISE_GLSL}

float ring(float d, float radius, float width) {
  return 1.0 - smoothstep(0.0, width, abs(d - radius));
}

void main() {
  vec2 p = vWorld.xz / uCell;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float seed = realismHash(cell);
  if (seed > uDensity) discard;

  float t = uTime * uRate * mix(0.7, 1.3, realismHash(cell + 7.1)) + seed * 13.0;
  float life = fract(t);
  float cycle = floor(t);
  vec2 center = 0.3 + 0.4 * vec2(realismHash(cell + cycle * 1.37), realismHash(cell - cycle * 2.11 + 3.7));
  float d = length(f - center);
  float width = fwidth(d) * 1.5 + 0.012;

  float radius = life * uMaxRadius;
  float rings = ring(d, radius, width) + 0.55 * ring(d, radius * 0.62, width);
  float fade = (1.0 - life) * (1.0 - life);

  float clearZone = smoothstep(uClearRadius, uClearRadius + 0.8, length(vWorld.xz));
  vec2 edge = smoothstep(vec2(uHalfSize), vec2(uHalfSize - 0.6), abs(vWorld.xz));
  float distanceFade = 1.0 - smoothstep(uFadeDistance.x, uFadeDistance.y, distance(cameraPosition, vWorld));
  float alpha = rings * fade * uOpacity * clearZone * edge.x * edge.y * distanceFade;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;

export const STEAM_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uLifetime;
uniform float uRise;
uniform vec2 uSize;
uniform vec2 uDrift;

attribute vec3 aOrigin;
attribute vec2 aSeed;

varying vec2 vUv;
varying float vAlpha;
varying vec2 vNoiseOffset;

void main() {
  float age = fract(uTime / uLifetime + aSeed.x);
  float phase = aSeed.y * 6.2831853;
  vec3 center = aOrigin + vec3(
    uDrift.x * age * age + sin(age * 5.0 + phase) * 0.12,
    uRise * age,
    uDrift.y * age * age + cos(age * 4.0 + phase) * 0.1
  );
  vec3 world = (modelMatrix * vec4(center, 1.0)).xyz;

  float size = mix(uSize.x, uSize.y, sqrt(age)) * mix(0.8, 1.2, aSeed.y);
  float angle = phase + age * 0.9;
  vec2 q = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * position.xy * size;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  world += right * q.x + up * q.y;

  vUv = uv;
  vAlpha = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.4, 1.0, age));
  vNoiseOffset = vec2(aSeed.y * 3.7, age * 0.6 + aSeed.x);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const STEAM_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;
varying float vAlpha;
varying vec2 vNoiseOffset;

void main() {
  vec2 c = vUv - 0.5;
  float soft = 1.0 - smoothstep(0.1, 0.5, length(c));
  float wisps = texture2D(uNoise, vUv * 0.55 + vNoiseOffset).r;
  float alpha = soft * smoothstep(0.25, 0.85, wisps) * vAlpha * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;

export const AIRCRAFT_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSteady;

attribute vec3 aVelocity;
/** loop length (s, 0 = static), time offset */
attribute vec2 aLoop;
/** period (s, 0 = steady), phase, duty, minimum level */
attribute vec4 aBlink;
attribute vec3 aColor;
attribute float aSize;

varying vec3 vColor;
varying float vLevel;

void main() {
  vec3 p = position;
  float level = 1.0;
  if (aLoop.x > 0.0) {
    float progress = mod(uTime + aLoop.y, aLoop.x);
    p += aVelocity * progress;
    float f = progress / aLoop.x;
    level *= smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.92, 1.0, f));
  }
  if (aBlink.x > 0.0 && uSteady < 0.5) {
    float ph = fract(uTime / aBlink.x + aBlink.y);
    level *= mix(aBlink.w, 1.0, 1.0 - smoothstep(0.0, aBlink.z, ph));
  }
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * uPixelRatio * (0.6 + 0.4 * level);
  vColor = aColor;
  vLevel = level;
}
`;

export const AIRCRAFT_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vLevel;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-d * d * 10.0);
  float halo = exp(-d * d * 3.0) * 0.35;
  float alpha = (core + halo) * vLevel * (1.0 - smoothstep(0.85, 1.0, d));
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor * (1.0 + core * 1.5), alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;
