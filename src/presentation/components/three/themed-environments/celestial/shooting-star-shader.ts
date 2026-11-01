import * as THREE from 'three';
import { CELESTIAL_DOME, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';

const M = CELESTIAL_REALISM.SHOOTING_STARS;

export interface ShootingStarUniforms {
  [name: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
}

/** One quad per meteor: aCorner = (0 tail .. 1 head, -1 .. 1 across), aSeed per meteor. */
export function createShootingStarGeometry(count: number): THREE.BufferGeometry {
  const corners: number[] = [];
  const seeds: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    corners.push(0, -1, 1, -1, 1, 1, 0, 1);
    seeds.push(i + 1, i + 1, i + 1, i + 1);
    const base = i * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  // Positions are computed in the shader; the attribute only sets the vertex count.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 12), 3));
  geometry.setAttribute('aCorner', new THREE.Float32BufferAttribute(corners, 2));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setIndex(indices);
  return geometry;
}

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform float uYScale;
uniform float uWidth;
uniform float uDuration;
uniform float uTail;
uniform vec2 uPeriod;
attribute vec2 aCorner;
attribute float aSeed;
varying vec2 vCorner;
varying float vFade;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

vec3 skyPoint(float azimuth, float elevation) {
  vec3 dir = vec3(cos(elevation) * cos(azimuth), sin(elevation), cos(elevation) * sin(azimuth));
  return dir * vec3(uRadius, uRadius * uYScale, uRadius);
}

void main() {
  float period = mix(uPeriod.x, uPeriod.y, hash(aSeed * 7.13));
  float local = uTime + hash(aSeed * 3.71) * period;
  float cycle = floor(local / period);
  float t = (local - cycle * period) / uDuration;
  float inFlight = step(t, 1.0);

  // A new random path every flight
  float s = aSeed * 17.0 + cycle * 1.618;
  float az0 = hash(s) * 6.28318;
  float el0 = mix(0.6, 1.2, hash(s + 1.0));
  float dAz = mix(0.35, 0.75, hash(s + 2.0)) * (hash(s + 3.0) > 0.5 ? 1.0 : -1.0);
  float dEl = -mix(0.2, 0.42, hash(s + 4.0));

  float head = clamp(t, 0.0, 1.0);
  float tail = clamp(t - uTail, 0.0, 1.0);
  float p = mix(tail, head, aCorner.x);
  vec4 mv = modelViewMatrix * vec4(skyPoint(az0 + dAz * p, el0 + dEl * p), 1.0);
  vec4 headView = modelViewMatrix * vec4(skyPoint(az0 + dAz * head, el0 + dEl * head), 1.0);
  vec4 tailView = modelViewMatrix * vec4(skyPoint(az0 + dAz * tail, el0 + dEl * tail), 1.0);
  vec2 axis = headView.xy - tailView.xy + vec2(1e-5, 0.0);
  vec2 across = normalize(vec2(-axis.y, axis.x));
  // Tapered streak: thin tail, full width at the head; collapses when idle.
  mv.xy += across * aCorner.y * uWidth * mix(0.2, 1.0, aCorner.x) * inFlight;

  vCorner = aCorner;
  vFade = inFlight * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.65, 1.0, t));
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying vec2 vCorner;
varying float vFade;

void main() {
  float along = pow(vCorner.x, 2.2) + smoothstep(0.92, 1.0, vCorner.x) * 0.8;
  float alpha = vFade * along * (1.0 - vCorner.y * vCorner.y);
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`;

/** Additive meteor streaks; the colour is pushed above 1 so the bloom catches the head. */
export function createShootingStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: CELESTIAL_DOME.RADIUS - M.INSET },
      uYScale: { value: CELESTIAL_DOME.Y_SCALE },
      uWidth: { value: M.WIDTH },
      uDuration: { value: M.DURATION },
      uTail: { value: M.TAIL },
      uPeriod: { value: new THREE.Vector2(M.PERIOD[0], M.PERIOD[1]) },
      uColor: { value: new THREE.Color(M.COLOR).multiplyScalar(M.BRIGHTNESS) },
    } satisfies ShootingStarUniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
}
