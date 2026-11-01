import * as THREE from 'three';
import { PARTICLE_FIELD, type ParticleKindPreset } from '@/presentation/config/realism.config';
import { PARTICLE_FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from './particle-shader';
import { getParticleSprite } from './particle-sprites';
import { buildParticleColors, type ParticleBuffers } from './particle-buffers';

/** Uniforms the field updates per frame or per prop change. */
export interface ParticleUniforms {
  [name: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uBoxSize: THREE.IUniform<THREE.Vector3>;
  uFallSpeed: THREE.IUniform<number>;
  uSway: THREE.IUniform<number>;
  uSwayFrequency: THREE.IUniform<number>;
  uTurbulence: THREE.IUniform<number>;
  uWindOffset: THREE.IUniform<THREE.Vector3>;
  uGust: THREE.IUniform<number>;
  uVelocity: THREE.IUniform<THREE.Vector3>;
  uViewportHeight: THREE.IUniform<number>;
  uMaxPointSize: THREE.IUniform<number>;
  uClearCenter: THREE.IUniform<THREE.Vector2>;
  uClearRadius: THREE.IUniform<number>;
  uSizeScale: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
}

/** One ShaderMaterial per field (uniform values differ); the sprite texture and program are shared. */
export function createParticleMaterial(preset: ParticleKindPreset): THREE.ShaderMaterial & { uniforms: ParticleUniforms } {
  const uniforms: ParticleUniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uMap: { value: getParticleSprite(preset.sprite) },
    uTime: { value: 0 },
    uBoxSize: { value: new THREE.Vector3(1, 1, 1) },
    uFallSpeed: { value: preset.fallSpeed },
    uSway: { value: preset.sway },
    uSwayFrequency: { value: preset.swayFrequency },
    uTurbulence: { value: preset.turbulence },
    uWindOffset: { value: new THREE.Vector3() },
    uGust: { value: 0 },
    uSpin: { value: preset.spin },
    uFlip: { value: preset.flip },
    uFlicker: { value: preset.flicker },
    uHeightFade: { value: preset.heightFade },
    uStreak: { value: preset.sprite === 'rain' ? 1 : 0 },
    uVelocity: { value: new THREE.Vector3(0, -1, 0) },
    uRotationJitter: { value: preset.sprite === 'rain' ? 0 : 1 },
    uViewportHeight: { value: 800 },
    uMaxPointSize: { value: 48 },
    uFocusDistance: { value: preset.focusDistance },
    uEdgeFade: { value: PARTICLE_FIELD.EDGE_FADE },
    uNearFade: { value: new THREE.Vector2(...PARTICLE_FIELD.NEAR_FADE) },
    uClearCenter: { value: new THREE.Vector2() },
    uClearRadius: { value: 0 },
    uClearFeather: { value: PARTICLE_FIELD.CLEAR_FEATHER },
    uSizeScale: { value: 1 },
    uOpacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    fog: true,
    blending: preset.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    defines: preset.additive ? { ADDITIVE: '' } : {},
  });
  return material as THREE.ShaderMaterial & { uniforms: ParticleUniforms };
}

/** Points geometry from the seeded buffers plus per-particle palette colours. */
export function createParticleGeometry(buffers: ParticleBuffers, colors: readonly string[]): THREE.BufferGeometry {
  const color = new THREE.Color();
  const palette = colors.map((hex) => {
    color.set(hex);
    return [color.r, color.g, color.b] as const;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seeds, 4));
  geometry.setAttribute('aShape', new THREE.BufferAttribute(buffers.shapes, 4));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(buildParticleColors(buffers.seeds, palette), 3));
  return geometry;
}
