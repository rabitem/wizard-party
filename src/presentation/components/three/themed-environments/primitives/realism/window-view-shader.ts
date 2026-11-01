import { WINDOW_VIEW } from '@/presentation/config/realism.config';
import { FOG_FACTOR_GLSL, NOISE_GLSL, OUTPUT_TAIL_GLSL } from './glsl-chunks';

const { LAYERS } = WINDOW_VIEW;
const f = (value: number) => value.toFixed(3);

/**
 * Outdoor view behind a window pane, ray-cast in the fragment shader (an
 * "interior mapping" style trick): no hole in the wall, no extra geometry.
 * The view ray from the camera through each pane pixel is intersected with
 * vertical layer planes at increasing depth behind the glass, so the sky,
 * mountains, forest and falling snow show real parallax as the camera
 * orbits. Everything is in units of the window height.
 */
export const WINDOW_VIEW_VERTEX_SHADER = /* glsl */ `
uniform vec2 uSize;
varying vec2 vUv;
varying vec2 vLocal;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLocal = position.xy / uSize.y;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const WINDOW_VIEW_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 uSize;
uniform vec3 uCameraLocal;
uniform float uTime;
uniform float uVerticalParallax;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSnow;
uniform vec3 uMountain;
uniform vec3 uTreeFar;
uniform vec3 uTreeNear;
uniform vec3 uCelestial;
uniform vec3 uFlakes;
uniform vec3 uFrostColor;
uniform float uStars;
uniform vec2 uCelestialPosition;
uniform float uCelestialSize;
uniform float uBrightness;
uniform float uFrostAmount;
uniform float uPrecipitation; // 0 none, 1 snow, 2 rain
uniform float uSillDrift;
uniform sampler2D uMountains;
uniform sampler2D uTreesDense;
uniform sampler2D uTreesSparse;
uniform sampler2D uFrost;
varying vec2 vUv;
varying vec2 vLocal;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}
${NOISE_GLSL}

vec2 slope;
vec2 hitAt(float depth) { return vLocal + slope * depth; }

vec3 paintLayer(vec3 color, sampler2D tex, float depth, float base, float height, float width,
                float offset, vec3 tint, float haze) {
  vec2 hit = hitAt(depth);
  float v = (hit.y - base) / height;
  if (v > 1.0) return color;
  vec4 s = texture2D(tex, vec2(hit.x / width + offset, max(v, 0.004)));
  vec3 lit = mix(tint, uSnow, s.r);
  lit = mix(lit, uSkyHorizon, haze);
  return mix(color, lit, s.a);
}

vec3 precipitation(vec3 color, float depth, float cell, float radius, float blur, float speed, float density, float seed) {
  vec2 p = hitAt(depth);
  float drift = sin(uTime * 0.4 + seed) * 0.15;
  p += vec2(uTime * (0.05 + drift * 0.1), uTime * speed);
  if (uPrecipitation > 1.5) {
    p.x += p.y * 0.12;
    vec2 c = floor(p / vec2(cell, cell * 4.0));
    vec2 q = fract(p / vec2(cell, cell * 4.0)) - 0.5;
    float h = realismHash(c + seed);
    if (h > density) return color;
    q.x += (realismHash(c + seed + 7.0) - 0.5) * 0.6;
    float width = 0.015 + radius * 0.08;
    float streak = (1.0 - smoothstep(width, width + 0.02 + blur * 0.05, abs(q.x))) * (1.0 - smoothstep(0.05, 0.45, abs(q.y)));
    return mix(color, uFlakes, streak * (0.3 - blur * 0.15));
  }
  p.x += sin(p.y * 2.3 + seed * 3.1 + uTime * 0.7) * cell * 0.35;
  vec2 c = floor(p / cell);
  vec2 q = fract(p / cell) - 0.5;
  float h = realismHash(c + seed);
  if (h > density) return color;
  vec2 offset = vec2(realismHash(c + seed + 3.0), realismHash(c + seed + 5.0)) - 0.5;
  float d = length(q - offset * 0.5);
  float r = radius * (0.6 + 0.6 * realismHash(c + seed + 9.0));
  float flake = 1.0 - smoothstep(r * (1.0 - blur), r + blur * 0.15, d);
  return mix(color, uFlakes, flake * (0.95 - blur * 0.35));
}

void main() {
  vec3 dir = vec3(vLocal, 0.0) - uCameraLocal;
  dir.z = min(dir.z, -0.05);
  slope = vec2(dir.x, dir.y * uVerticalParallax) / -dir.z;

  // Sky: window position plus strong parallax (it is "at infinity"), stars, moon / sun with halo.
  vec2 sky = vLocal + slope * 1.5;
  float elevation = smoothstep(-0.55, 0.5, sky.y);
  vec3 color = mix(uSkyHorizon, uSkyTop, elevation);
  vec2 starCell = floor(sky * 70.0);
  float star = step(1.0 - 0.06 * uStars, realismHash(starCell));
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.0 + realismHash(starCell + 1.0) * 30.0);
  vec2 starOffset = fract(sky * 70.0) - 0.5;
  color += star * twinkle * (1.0 - smoothstep(0.04, 0.22, length(starOffset))) * elevation * 0.8;
  float sunDistance = length(sky - uCelestialPosition);
  float disc = 1.0 - smoothstep(uCelestialSize * 0.85, uCelestialSize, sunDistance);
  color = mix(color, uCelestial, disc);
  color += uCelestial * exp(-sunDistance / (uCelestialSize * 2.5)) * 0.3;

  color = paintLayer(color, uMountains, ${f(LAYERS.mountains.depth)}, ${f(LAYERS.mountains.base)},
    ${f(LAYERS.mountains.height)}, ${f(LAYERS.mountains.width)}, 0.13, uMountain, 0.45);
  #if PRECIPITATION_LAYERS > 3
    if (uPrecipitation > 0.5) color = precipitation(color, 4.0, 0.05, 0.12, 0.05, 0.22, 0.55, 11.0);
  #endif
  color = paintLayer(color, uTreesDense, ${f(LAYERS.farTrees.depth)}, ${f(LAYERS.farTrees.base)},
    ${f(LAYERS.farTrees.height)}, ${f(LAYERS.farTrees.width)}, 0.41, uTreeFar, 0.22);
  #if PRECIPITATION_LAYERS > 2
    if (uPrecipitation > 0.5) color = precipitation(color, 2.0, 0.06, 0.14, 0.08, 0.3, 0.5, 23.0);
  #endif
  color = paintLayer(color, uTreesSparse, ${f(LAYERS.nearTrees.depth)}, ${f(LAYERS.nearTrees.base)},
    ${f(LAYERS.nearTrees.height)}, ${f(LAYERS.nearTrees.width)}, 0.77, uTreeNear, 0.05);
  if (uPrecipitation > 0.5) {
    color = precipitation(color, 0.8, 0.08, 0.16, 0.2, 0.42, 0.45, 37.0);
    #if PRECIPITATION_LAYERS > 1
      color = precipitation(color, 0.3, 0.12, 0.2, 0.55, 0.55, 0.3, 51.0);
    #endif
  }

  // Snow drift piled on the outer sill, just behind the glass.
  vec2 sill = hitAt(0.08);
  float driftTop = -0.5 + uSillDrift * (0.65 + 0.35 * realismNoise(vec2(sill.x * 9.0, 1.7)));
  float drift = 1.0 - smoothstep(driftTop - 0.006, driftTop + 0.006, sill.y);
  float sparkle = step(0.994, realismHash(floor(sill * 420.0))) * (0.5 + 0.5 * sin(uTime * 3.0 + sill.x * 40.0));
  vec3 driftColor = uSnow * (0.82 + 0.18 * smoothstep(driftTop - 0.06, driftTop, sill.y)) + sparkle * 0.6;
  color = mix(color, driftColor, drift * step(0.5, uSillDrift * 100.0));

  color *= uBrightness;

  // Glass: frost creeping from the edges, a faint diagonal sheen, darker corners.
  vec4 frost = texture2D(uFrost, vUv);
  color = mix(color, uFrostColor * max(uBrightness, 0.6), frost.a * uFrostAmount);
  float sheen = smoothstep(0.35, 0.0, abs(vUv.x - vUv.y * 0.6 - 0.25)) * 0.05;
  color += sheen;
  vec2 edge = min(vUv, 1.0 - vUv) * uSize / uSize.y;
  color *= mix(0.72, 1.0, smoothstep(0.0, 0.08, min(edge.x, edge.y)));

  #ifdef USE_FOG
    color = mix(color, fogColor, realismFogFactor());
  #endif
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_TAIL_GLSL}
}
`;
