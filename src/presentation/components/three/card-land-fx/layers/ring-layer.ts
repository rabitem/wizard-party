/**
 * Flat expanding rings drawn by a fragment shader on a single quad each:
 * water ripples (summer) and the jagged cyan/magenta glitch ring (neon).
 */

import * as THREE from 'three';
import { LAND_FX_LAYOUT } from '../land-fx.constants';
import type { Rng } from '../land-fx-selection';
import type { FxBlending } from './point-sprite-material';
import type { LandFxLayer } from './types';

export interface RingSpec {
  delay: number;
  duration: number;
  /** World radius reached at the end. */
  maxRadius: number;
  /** Line width as a fraction of maxRadius. */
  width: number;
  color: string;
  /** Second colour, only used by the glitch style. */
  color2?: string;
  opacity: number;
}

export interface RingLayerOptions {
  rings: readonly RingSpec[];
  glitch?: boolean;
  blending?: FxBlending;
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uRadius;
uniform float uWidth;
uniform float uOpacity;
uniform float uGlitch;
uniform float uSeed;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d = length(p);
  float seg = floor((atan(p.y, p.x) + 3.14159) * 3.0 + uSeed);
  float jag = uGlitch * (hash(seg) - 0.5) * 0.14;
  float r1 = smoothstep(uWidth, 0.0, abs(d - uRadius - jag));
  float r2 = uGlitch * smoothstep(uWidth, 0.0, abs(d - uRadius * 0.93 + jag));
  float a = max(r1, r2) * uOpacity;
  if (a < 0.01) discard;
  vec3 col = (uColor * r1 + uColor2 * r2) / max(r1 + r2, 0.001);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

let sharedQuad: THREE.PlaneGeometry | null = null;
function getQuad(): THREE.PlaneGeometry {
  if (!sharedQuad) {
    sharedQuad = new THREE.PlaneGeometry(2, 2);
    sharedQuad.rotateX(-Math.PI / 2);
  }
  return sharedQuad;
}

/** Number of discrete glitch re-rolls over a ring's life. */
const GLITCH_STEPS = 9;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);

export class RingLayer implements LandFxLayer {
  readonly object = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly rings: readonly RingSpec[];
  private readonly glitch: boolean;
  private readonly seeds: number[] = [];

  constructor(options: RingLayerOptions) {
    this.rings = options.rings;
    this.glitch = !!options.glitch;
    options.rings.forEach((ring, i) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uRadius: { value: 0 },
          uWidth: { value: ring.width },
          uOpacity: { value: 0 },
          uGlitch: { value: this.glitch ? 1 : 0 },
          uSeed: { value: 0 },
          uColor: { value: new THREE.Color(ring.color) },
          uColor2: { value: new THREE.Color(ring.color2 ?? ring.color) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: options.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(getQuad(), material);
      mesh.position.y = LAND_FX_LAYOUT.DECAL_Y + i * LAND_FX_LAYOUT.DECAL_Y_STEP;
      mesh.scale.setScalar(ring.maxRadius);
      mesh.renderOrder = 2;
      mesh.visible = false;
      this.object.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);
    });
  }

  reset(rand: Rng): void {
    this.materials.forEach((m, i) => {
      this.seeds[i] = Math.floor(rand() * 100);
      m.uniforms.uSeed.value = this.seeds[i];
      m.uniforms.uOpacity.value = 0;
    });
    this.meshes.forEach((mesh) => {
      mesh.visible = false;
      mesh.rotation.y = rand() * Math.PI * 2;
    });
  }

  update(t: number): void {
    this.rings.forEach((ring, i) => {
      const local = (t - ring.delay) / ring.duration;
      const mesh = this.meshes[i];
      const u = this.materials[i].uniforms;
      if (local < 0 || local >= 1) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      u.uRadius.value = 0.08 + easeOut(local) * 0.86;
      u.uWidth.value = ring.width * (1 - local * 0.5);
      u.uOpacity.value = ring.opacity * (1 - local) * Math.min(1, local * 8);
      // Glitch: re-roll the jagged segments in discrete jumps
      if (this.glitch) u.uSeed.value = this.seeds[i] + Math.floor(local * GLITCH_STEPS) * 1.7;
    });
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
  }
}
