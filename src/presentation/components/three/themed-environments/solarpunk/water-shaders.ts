import { FOG_FACTOR_GLSL, NOISE_GLSL, OUTPUT_TAIL_GLSL } from '../primitives/realism/glsl-chunks';

/**
 * GLSL for the animated water surface and the caustic light patches. Both run
 * in a THREE.ShaderMaterial (three supplies matrices, cameraPosition, fog
 * defines and the tone mapping / colour space helpers).
 */

const WORLD_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const WATER_VERTEX_SHADER = WORLD_VERTEX;

/**
 * Height field: radial rings from uCenter (fountain) blended with flowing
 * noise along +x (channel); normal from finite differences, then fresnel sky
 * reflection over a deep/shallow body colour plus a sun glint (> 1 so the
 * bloom pass picks it up).
 */
export const WATER_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uHighlight;
uniform vec3 uSunDir;
uniform vec2 uCenter;
uniform float uRadial;
uniform float uFlow;
uniform float uScale;
uniform float uOpacity;
uniform float uGlint;
varying vec3 vWorld;
varying vec2 vUv;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}
${NOISE_GLSL}

float waterHeight(vec2 p) {
  vec2 d = p - uCenter;
  float r = length(d);
  float rings = sin(r * 14.0 - uTime * 3.2) * exp(-r * 0.9) * uRadial;
  vec2 q = p * uScale + vec2(uTime * uFlow, 0.0);
  float n = realismNoise(q) * 0.6 + realismNoise(q * 2.3 + vec2(-uTime * 0.21, uTime * 0.13)) * 0.4;
  float swell = sin(p.x * 3.1 + uTime * 1.3 + sin(p.y * 2.0)) * 0.25 + sin(p.y * 4.7 - uTime * 1.7) * 0.15;
  return rings * 0.35 + n * 0.5 + swell * 0.2;
}

void main() {
  vec2 p = vWorld.xz;
  float e = 0.04;
  float h = waterHeight(p);
  float hx = waterHeight(p + vec2(e, 0.0)) - h;
  float hz = waterHeight(p + vec2(0.0, e)) - h;
  vec3 n = normalize(vec3(-hx / e * 0.08, 1.0, -hz / e * 0.08));
  vec3 v = normalize(cameraPosition - vWorld);
  float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
  vec3 body = mix(uDeep, uShallow, clamp(h * 0.9 + 0.25, 0.0, 1.0));
  vec3 rgb = mix(body, uSky, clamp(fresnel * 1.6, 0.0, 0.85));
  vec3 r = reflect(-normalize(uSunDir), n);
  float glint = pow(max(dot(r, v), 0.0), 90.0) * uGlint;
  float sparkle = step(0.985, realismNoise(p * 38.0 + uTime * 0.7)) * smoothstep(0.2, 0.6, h) * uGlint * 0.4;
  rgb += uHighlight * (glint + sparkle);
  float alpha = clamp(mix(uOpacity, 1.0, fresnel) + glint, 0.0, 1.0);
  #ifdef USE_FOG
    rgb = mix(rgb, fogColor, realismFogFactor());
  #endif
  gl_FragColor = vec4(rgb, alpha);
  ${OUTPUT_TAIL_GLSL}
}
`;

export const CAUSTICS_VERTEX_SHADER = WORLD_VERTEX;

/**
 * Additive caustic net (a few iterations of a warped sine lattice) masked by
 * a soft ellipse (or rectangle, uRect = 1) in UV space. uCaustic 0 gives a plain soft light pool.
 */
export const CAUSTICS_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uScale;
uniform float uCaustic;
uniform float uEdge;
uniform float uRect;
varying vec3 vWorld;
varying vec2 vUv;
#include <fog_pars_fragment>
${FOG_FACTOR_GLSL}

float causticNet(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.005;
  for (int k = 0; k < 3; k++) {
    float tk = t * (1.0 - 3.5 / float(k + 1));
    i = p + vec2(cos(tk - i.x) + sin(tk + i.y), sin(tk - i.y) + cos(tk + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tk) / inten), p.y / (cos(i.y + tk) / inten)));
  }
  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main() {
  vec2 d = (vUv - 0.5) * 2.0;
  float radius = mix(length(d), max(abs(d.x), abs(d.y)), uRect);
  float mask = 1.0 - smoothstep(1.0 - uEdge, 1.0, radius);
  if (mask <= 0.0) discard;
  float net = causticNet(vWorld.xz * uScale, uTime);
  float light = mix(0.55, clamp(net, 0.0, 1.6), uCaustic);
  float alpha = light * mask * uIntensity;
  #ifdef USE_FOG
    alpha *= 1.0 - realismFogFactor();
  #endif
  gl_FragColor = vec4(uColor * alpha, 1.0);
  ${OUTPUT_TAIL_GLSL}
}
`;
