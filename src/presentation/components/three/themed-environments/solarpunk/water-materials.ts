import * as THREE from 'three';
import {
  CAUSTICS_FRAGMENT_SHADER,
  CAUSTICS_VERTEX_SHADER,
  WATER_FRAGMENT_SHADER,
  WATER_VERTEX_SHADER,
} from './water-shaders';

/**
 * Factories for the animated water surface and caustic light patches
 * (shared by the solarpunk channel and the spring fountain). Drive `uTime`
 * through shaderUniforms(ref) in a frame loop.
 */

export interface WaterSurfaceOptions {
  deep: string;
  shallow: string;
  sky: string;
  highlight: string;
  opacity: number;
  /** World xz centre of the radial rings */
  center?: readonly [number, number];
  /** 0..1 strength of the radial rings (fountain) */
  radial?: number;
  /** Flow speed of the noise along +x (channel) */
  flow?: number;
  /** Noise frequency per world unit */
  scale?: number;
  /** Sun glint strength (values > 1 bloom) */
  glint?: number;
  /** Direction towards the sun */
  sunDirection?: readonly [number, number, number];
}

export function createWaterSurfaceMaterial(options: WaterSurfaceOptions): THREE.ShaderMaterial {
  const [cx, cz] = options.center ?? [0, 0];
  const sun = options.sunDirection ?? [-0.4, 0.8, -0.45];
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(options.deep) },
      uShallow: { value: new THREE.Color(options.shallow) },
      uSky: { value: new THREE.Color(options.sky) },
      uHighlight: { value: new THREE.Color(options.highlight) },
      uSunDir: { value: new THREE.Vector3(...sun).normalize() },
      uCenter: { value: new THREE.Vector2(cx, cz) },
      uRadial: { value: options.radial ?? 0 },
      uFlow: { value: options.flow ?? 0 },
      uScale: { value: options.scale ?? 2.2 },
      uOpacity: { value: options.opacity },
      uGlint: { value: options.glint ?? 2.2 },
    },
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

export interface CausticsOptions {
  color: string;
  intensity: number;
  /** Caustic cells per world unit */
  scale?: number;
  /** 1 = caustic net, 0 = plain soft light pool */
  caustic?: number;
  /** Width of the soft edge (0..1) */
  edge?: number;
  /** Mask shape inscribed in the plane's UV square */
  shape?: 'ellipse' | 'rect';
}

/** Additive light patch for a plane (soft ellipse or rectangle over its UV square). */
export function createCausticsMaterial(options: CausticsOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(options.color) },
      uIntensity: { value: options.intensity },
      uScale: { value: options.scale ?? 1.6 },
      uCaustic: { value: options.caustic ?? 1 },
      uEdge: { value: options.edge ?? 0.45 },
      uRect: { value: options.shape === 'rect' ? 1 : 0 },
    },
    vertexShader: CAUSTICS_VERTEX_SHADER,
    fragmentShader: CAUSTICS_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
}
