import * as THREE from 'three';
import { SURFACE_LAYOUT } from '../surface.config';

/** Pool water look (sRGB hex; three converts to linear for the uniforms). */
export const POOL_WATER_COLORS = {
  DEEP: '#0a5f8f',
  SHALLOW: '#3cc4e0',
  SKY: '#c8f0ff',
} as const;

/** Time used when the viewer prefers reduced motion (a pleasant still frame). */
export const POOL_STILL_TIME = 12;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// Cheap stylised water: summed-sine wave normals, a 4-step caustic pattern on a
// refracted tiled pool floor, fresnel sky tint and sharp moving sun glints.
const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSunDir;
varying vec3 vWorld;

float caustic(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

vec2 wave(vec2 p, vec2 dir, float freq, float speed, float amp, float t) {
  return dir * cos(dot(p, dir) * freq + t * speed) * amp;
}

vec3 waveNormal(vec2 p, float t) {
  vec2 d = wave(p, vec2(0.8, 0.6), 6.0, 1.7, 0.6, t);
  d += wave(p, vec2(-0.5, 0.866), 9.0, 2.3, 0.4, t);
  d += wave(p, vec2(0.196, -0.98), 15.0, 3.1, 0.25, t);
  d += wave(p, vec2(-0.949, -0.316), 23.0, 3.7, 0.15, t);
  return normalize(vec3(-d.x * 0.08, 1.0, -d.y * 0.08));
}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p) / uRadius;
  vec3 n = waveNormal(p, uTime);

  // Refracted pool floor: deeper (darker) toward the middle, white grout tiles
  vec2 floorP = p + n.xz * 0.35;
  vec2 tile = abs(fract(floorP * 4.0) - 0.5);
  float grout = smoothstep(0.46, 0.5, max(tile.x, tile.y));
  vec3 color = mix(uShallow, uDeep, clamp(1.0 - r * 0.8, 0.0, 1.0));
  color = mix(color, vec3(0.85, 0.95, 1.0), grout * 0.22);

  float c = caustic(floorP * 2.2 - 250.0, uTime * 0.9);
  color = color * (0.78 + c * 0.9) + c * 0.1;

  // Shade under the pool wall
  color *= 1.0 - smoothstep(0.93, 1.0, r) * 0.35;

  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
  color = mix(color, uSky, clamp(fresnel * 0.9 + 0.05, 0.0, 0.6));

  float facing = max(dot(n, normalize(uSunDir + viewDir)), 0.0);
  float glint = pow(facing, 220.0) * 1.6 + step(0.9986, facing) * 0.6;
  color += vec3(1.0, 0.97, 0.88) * glint;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type PoolWaterMaterial = THREE.ShaderMaterial & {
  uniforms: { uTime: THREE.IUniform<number> };
};

/** Opaque animated water for the play disc. Advance `uniforms.uTime` each frame. */
export function createPoolWaterMaterial(): PoolWaterMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: POOL_STILL_TIME },
      uRadius: { value: SURFACE_LAYOUT.FELT_RADIUS },
      uDeep: { value: new THREE.Color(POOL_WATER_COLORS.DEEP) },
      uShallow: { value: new THREE.Color(POOL_WATER_COLORS.SHALLOW) },
      uSky: { value: new THREE.Color(POOL_WATER_COLORS.SKY) },
      uSunDir: { value: new THREE.Vector3(0.35, 1, 0.25).normalize() },
    },
  }) as PoolWaterMaterial;
}

/** Advances the water animation (kept outside components so hook values stay immutable there). */
export function setPoolWaterTime(material: PoolWaterMaterial, time: number): void {
  material.uniforms.uTime.value = time;
}
