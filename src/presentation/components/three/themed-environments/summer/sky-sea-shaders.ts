import { NOISE_GLSL, OUTPUT_TAIL_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * GLSL for the summer sunset sky dome and the sea. Both sample the same
 * vertical sky gradient (v = elevation) so the water reflects the sky it
 * sits under. Directions are camera-relative, so the sky reads as infinitely
 * far away and the sun keeps its parallax-free position.
 */

/** Elevation (0 horizon .. 1 zenith) of a direction, as a gradient v coordinate. */
const ELEVATION_GLSL = /* glsl */ `
float skyElevation(vec3 dir) {
  return asin(clamp(dir.y, 0.0, 1.0)) / 1.5707963;
}
`;

export const SKY_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorld;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SKY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uGradient;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uGlowColor;
uniform vec3 uHazeColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uSunRadius;
uniform float uSunIntensity;
uniform float uCloudCover;
uniform float uCloudDrift;
uniform float uShimmer;
uniform float uTime;
varying vec3 vWorld;

${NOISE_GLSL}
${ELEVATION_GLSL}

float skyFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * realismNoise(p);
    p = p * 2.07 + 17.3;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  float elevation = max(dir.y, 0.0);

  // Heat haze: the air above the warm sea wobbles the horizon and the sun.
  float hazeMask = 1.0 - smoothstep(0.0, 0.14, elevation);
  float wobble = sin(dir.y * 420.0 + uTime * 3.1) * 0.6 + sin(dir.x * 260.0 - uTime * 2.3) * 0.4;
  vec3 hazed = normalize(dir + vec3(wobble, wobble * 0.5, 0.0) * uShimmer * hazeMask);

  vec3 sky = texture2D(uGradient, vec2(0.5, skyElevation(hazed))).rgb;
  vec3 sunDir = normalize(uSunPosition - cameraPosition);
  float cosAngle = dot(hazed, sunDir);
  float angle = acos(clamp(cosAngle, -1.0, 1.0));

  // Forward-scattering glow around the sun plus a bright haze band on the horizon.
  sky += uGlowColor * (exp(-angle * 9.0) * 0.55 + exp(-angle * 2.4) * 0.22);
  float band = exp(-elevation * 16.0);
  sky = mix(sky, uHazeColor, band * (0.22 + 0.38 * max(cosAngle, 0.0)));

  // Thin sunset streaks on a flat cloud layer, lit gold towards the sun.
  vec2 layer = dir.xz / (elevation + 0.08);
  float n = skyFbm(layer * vec2(0.32, 1.7) + vec2(uTime * uCloudDrift, 0.0));
  float cover = 1.0 - uCloudCover;
  float cloud = smoothstep(cover, cover + 0.24, n) * smoothstep(0.02, 0.08, elevation) * (1.0 - smoothstep(0.24, 0.5, elevation));
  float lit = clamp(pow(max(cosAngle, 0.0), 3.0) * 1.2 + n * 0.3, 0.0, 1.0);
  sky = mix(sky, mix(uCloudShade, uCloudLit, lit), cloud * 0.82);

  // Limb-darkened sun disc; clouds veil it partially.
  float disc = 1.0 - smoothstep(uSunRadius * 0.9, uSunRadius, angle);
  float limb = 1.0 - 0.35 * pow(clamp(angle / uSunRadius, 0.0, 1.0), 2.0);
  sky = mix(sky, uSunColor * uSunIntensity * limb, disc * (1.0 - cloud * 0.7));

  gl_FragColor = vec4(sky, 1.0);
  ${OUTPUT_TAIL_GLSL}
}
`;

export const SEA_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const SEA_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uGradient;
uniform sampler2D uNoise;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec2 uDetail;
uniform vec2 uDetailScale;
uniform float uGlitter;
uniform float uSunPath;
uniform float uShoreZ;
uniform float uFoamWidth;
uniform float uTime;
varying vec3 vWorld;
#include <fog_pars_fragment>

${ELEVATION_GLSL}

/** Slope (dh/dx, dh/dz) of one travelling swell. */
vec2 swell(vec2 p, vec2 dir, float frequency, float amplitude, float speed) {
  return dir * cos(dot(p, dir) * frequency + uTime * speed) * frequency * amplitude;
}

/** Slope of the tileable noise texture at uv (forward differences). */
vec2 noiseSlope(vec2 uv) {
  float e = 1.0 / 128.0;
  float h = texture2D(uNoise, uv).r;
  return vec2(texture2D(uNoise, uv + vec2(e, 0.0)).r - h, texture2D(uNoise, uv + vec2(0.0, e)).r - h) / e;
}

void main() {
  vec2 p = vWorld.xz;
  float dist = length(cameraPosition - vWorld);

  vec2 slope = swell(p, vec2(0.0, -1.0), 0.32, 0.16, 1.1)
    + swell(p, normalize(vec2(0.6, -1.0)), 0.55, 0.07, 1.6)
    + swell(p, normalize(vec2(-0.8, -1.0)), 0.9, 0.04, 2.1)
    + swell(p, normalize(vec2(1.0, -0.2)), 1.7, 0.015, 2.9);
  vec2 uvA = p * uDetailScale.x + vec2(uTime * 0.010, uTime * 0.017);
  vec2 uvB = p * uDetailScale.y + vec2(-uTime * 0.021, uTime * 0.012);
  slope += noiseSlope(uvA) * uDetailScale.x * uDetail.x + noiseSlope(uvB) * uDetailScale.y * uDetail.y;
  // Calm the far water (also hides aliasing) and add heat shimmer near the horizon.
  slope *= mix(0.35, 1.0, 1.0 / (1.0 + dist * 0.025));
  slope.x += sin(p.x * 2.3 + uTime * 4.0) * 0.02 * smoothstep(40.0, 75.0, dist);

  vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 view = normalize(cameraPosition - vWorld);
  float facing = max(dot(normal, view), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 reflected = reflect(-view, normal);

  vec3 sunDir = normalize(uSunPosition - vWorld);
  float sunDot = max(dot(reflected, sunDir), 0.0);
  vec3 skyReflection = texture2D(uGradient, vec2(0.5, skyElevation(reflected))).rgb;
  skyReflection += uSunColor * pow(sunDot, 12.0) * uSunPath;

  vec3 body = mix(uDeep, uShallow, clamp(0.35 + slope.x * 0.6 + (1.0 - facing) * 0.25, 0.0, 1.0));
  vec3 color = mix(body, skyReflection, fresnel);
  // Glitter path: tiny facets catching the low sun (bright enough to bloom).
  color += uSunColor * (pow(sunDot, 900.0) + pow(sunDot, 160.0) * 0.12) * uGlitter;

  // Foam lines running up the beach.
  float shore = uShoreZ - vWorld.z;
  float foamNoise = texture2D(uNoise, p * 0.15 + vec2(0.0, uTime * 0.02)).r;
  float foamBand = 1.0 - smoothstep(0.0, uFoamWidth, shore);
  float lines = smoothstep(0.55, 0.85, sin(shore * 3.2 - uTime * 1.3 + foamNoise * 5.0) * 0.5 + 0.5);
  float edge = 1.0 - smoothstep(0.0, 0.45, shore);
  float foam = foamBand * max(lines * 0.7, edge) * smoothstep(0.25, 0.6, foamNoise + foamBand * 0.3);
  color = mix(color, uFoam, clamp(foam, 0.0, 1.0) * 0.8);

  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_TAIL_GLSL}
  #include <fog_fragment>
}
`;
