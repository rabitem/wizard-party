import * as THREE from 'three';
import { CELESTIAL_DOME, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { seededRandom } from '../primitives';
import { getMilkyWayBasis, milkyWayPoint } from './celestial-geometry';

const S = CELESTIAL_REALISM.STARFIELD;
/** Lowest star elevation (sin) so none sink behind the dome rim. */
const MIN_HEIGHT = 0.03;

export interface StarfieldUniforms {
  [name: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uViewportHeight: THREE.IUniform<number>;
  uMaxSize: THREE.IUniform<number>;
}

/**
 * Star positions on the squashed dome (local to the sky group), with
 * per-star size, colour x brightness and twinkle (phase, speed, amount).
 * Half the stars crowd the milky-way band; magnitudes follow a steep power
 * law so most are faint pinpricks and a few are bright enough to bloom.
 */
export function createStarfieldGeometry(count: number, seed = 7): THREE.BufferGeometry {
  const rand = seededRandom(seed);
  const basis = getMilkyWayBasis();
  const radius = CELESTIAL_DOME.RADIUS - S.INSET;
  const direction = new THREE.Vector3();
  const color = new THREE.Color();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    if (rand() < S.BAND_SHARE) {
      const offset = (rand() + rand() + rand() - 1.5) * CELESTIAL_REALISM.MILKY_WAY.WIDTH;
      milkyWayPoint(basis, rand() * Math.PI * 2, offset, direction);
      direction.y = Math.max(Math.abs(direction.y), MIN_HEIGHT);
      direction.normalize();
    } else {
      // Uniform over the hemisphere (uniform height = uniform solid angle)
      const height = MIN_HEIGHT + rand() * (1 - MIN_HEIGHT);
      const ring = Math.sqrt(1 - height * height);
      const azimuth = rand() * Math.PI * 2;
      direction.set(Math.cos(azimuth) * ring, height, Math.sin(azimuth) * ring);
    }
    positions[i * 3] = direction.x * radius;
    positions[i * 3 + 1] = direction.y * radius * CELESTIAL_DOME.Y_SCALE;
    positions[i * 3 + 2] = direction.z * radius;

    const magnitude = Math.pow(rand(), 3.2);
    sizes[i] = S.SIZE[0] + magnitude * (S.SIZE[1] - S.SIZE[0]);
    const brightness = S.BRIGHTNESS[0] + magnitude * (S.BRIGHTNESS[1] - S.BRIGHTNESS[0]);
    color.set(S.COLORS[Math.floor(rand() * S.COLORS.length)]).multiplyScalar(brightness);
    color.toArray(colors, i * 3);

    // Stars low over the rim scintillate more (thicker air), like the real sky.
    twinkles[i * 3] = rand() * Math.PI * 2;
    twinkles[i * 3 + 1] = S.TWINKLE_SPEED[0] + rand() * (S.TWINKLE_SPEED[1] - S.TWINKLE_SPEED[0]);
    twinkles[i * 3 + 2] = 0.25 + (1 - direction.y) * 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 3));
  return geometry;
}

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uViewportHeight;
uniform float uMaxSize;
attribute vec3 aColor;
attribute float aSize;
attribute vec3 aTwinkle;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float depth = max(-mvPosition.z, 0.1);
  float pixels = aSize * projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  float wave = sin(uTime * aTwinkle.y + aTwinkle.x) * 0.6 + sin(uTime * aTwinkle.y * 2.7 + aTwinkle.x * 1.9) * 0.4;
  float twinkle = max(1.0 + aTwinkle.z * wave, 0.15);
  // Sub-pixel stars fade instead of shimmering; size never drops below ~1.5 px.
  vAlpha = clamp(pixels / 1.5, 0.15, 1.0) * twinkle;
  vColor = aColor;
  gl_PointSize = clamp(pixels, 1.5, uMaxSize);
}
`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r2 = dot(p, p) * 4.0;
  float core = exp(-r2 * 16.0);
  float halo = exp(-r2 * 4.0) * 0.3;
  float alpha = (core + halo) * vAlpha * (1.0 - smoothstep(0.7, 1.0, r2));
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor, alpha);
  #include <colorspace_fragment>
}
`;

/** Additive star sprites; colours above 1 feed the room bloom. */
export function createStarfieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uViewportHeight: { value: 800 },
      uMaxSize: { value: S.MAX_POINT_SIZE },
    } satisfies StarfieldUniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
}
