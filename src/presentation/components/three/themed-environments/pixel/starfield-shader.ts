import { NOISE_GLSL, OUTPUT_TAIL_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * Parallax pixel starfield seen through a wall "window". Each layer is a
 * virtual plane `depth` units behind the wall: the view ray (in the window's
 * local space) is intersected with it, the hit point snapped to a pixel grid
 * and every grid cell hashed into an optional star with a stepped 8-bit
 * twinkle. Farther layers use bigger cells so apparent pixel size stays
 * similar. A banded sky gradient, a quantised nebula and an optional pixel
 * moon sit behind the stars. Colours above 1 feed the bloom pass.
 */
export const STARFIELD_VERTEX_SHADER = /* glsl */ `
varying vec3 vLocal;
varying vec3 vCamera;

void main() {
  vLocal = position;
  vCamera = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const STARFIELD_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uSize;
uniform float uPixels;
uniform vec3 uDepths;
uniform vec3 uDensities;
uniform int uLayers;
uniform float uSteps;
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uNebula;
uniform vec3 uStarWarm;
uniform vec3 uStarCool;
uniform vec4 uMoon;
uniform vec3 uMoonColor;

varying vec3 vLocal;
varying vec3 vCamera;

${NOISE_GLSL}

vec2 hitLayer(vec3 rd, float depth) {
  float t = (-depth - vLocal.z) / min(rd.z, -0.05);
  return (vLocal + rd * t).xy;
}

float twinkle(float seed) {
  float wave = 0.5 + 0.5 * sin(uTime * (0.8 + seed * 2.6) + seed * 41.0);
  return floor(wave * uSteps + 0.5) / uSteps;
}

vec3 starLayer(vec3 rd, float depth, float density, float salt, bool crosses) {
  float cellSize = (1.0 + depth * 0.12) / uPixels;
  vec2 grid = hitLayer(rd, depth) / cellSize;
  vec2 cell = floor(grid);
  float h = realismHash(cell + salt);
  vec3 tint = mix(uStarCool, uStarWarm, step(0.55, realismHash(cell + salt + 5.3)));
  vec3 color = vec3(0.0);
  if (h > 1.0 - density) color = tint * (0.45 + 1.1 * twinkle(h));
  if (crosses) {
    // Bright stars light their four neighbours dimly: a chunky 8-bit sparkle
    float big = 1.0 - density * 0.15;
    float arms = step(big, realismHash(cell + vec2(1.0, 0.0) + salt)) + step(big, realismHash(cell - vec2(1.0, 0.0) + salt))
      + step(big, realismHash(cell + vec2(0.0, 1.0) + salt)) + step(big, realismHash(cell - vec2(0.0, 1.0) + salt));
    color += uStarWarm * min(arms, 1.0) * 0.45 * twinkle(h + 0.3);
    if (h > big) color = uStarWarm * 1.8;
  }
  return color;
}

void main() {
  vec3 rd = normalize(vLocal - vCamera);
  vec2 uv = vLocal.xy / uSize + 0.5;

  float pixel = 1.0 / uPixels;
  float bands = floor(uv.y * 8.0) / 8.0;
  float dither = mod(floor(vLocal.x / pixel) + floor(vLocal.y / pixel), 2.0) * 0.06;
  vec3 color = mix(uSkyBottom, uSkyTop, clamp(bands + dither, 0.0, 1.0));

  vec2 far = hitLayer(rd, uDepths.z) * 0.12;
  float cloud = realismNoise(floor(far * 6.0) / 6.0 * 1.0) * realismNoise(far * 0.5 + 3.0);
  color += uNebula * floor(cloud * 4.0) / 4.0 * 0.6;

  if (uMoon.z > 0.0) {
    vec2 m = hitLayer(rd, uDepths.y) - uMoon.xy * uSize;
    vec2 snapped = floor(m / (pixel * 2.0)) * pixel * 2.0;
    float disc = step(length(snapped), uMoon.z);
    float shade = step(length(snapped - vec2(uMoon.z * 0.45, uMoon.z * 0.2)), uMoon.z * 0.85);
    color = mix(color, uMoonColor * (1.3 - shade * 0.75), disc);
  }

  color += starLayer(rd, uDepths.z, uDensities.z, 31.0, false);
  if (uLayers > 2) color += starLayer(rd, uDepths.y, uDensities.y, 17.0, false);
  color += starLayer(rd, uDepths.x, uDensities.x, 3.0, true);

  vec2 edge = min(uv, 1.0 - uv) * uSize;
  color *= 0.55 + 0.45 * smoothstep(0.0, 0.5, min(edge.x, edge.y));
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_TAIL_GLSL}
}
`;
