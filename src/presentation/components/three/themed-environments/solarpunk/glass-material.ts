import * as THREE from 'three';
import { SOLARPUNK_GLASS } from '@/presentation/config/solarpunk-environment.config';
import { addSurfaceDetail } from '../primitives';

/**
 * Greenhouse glazing: a transparent MeshStandardMaterial with fine roughness
 * / normal variation (so sun highlights break up like real glass), plus a
 * fresnel sheen and faint diagonal streaks that reflect the sky. Grazing
 * angles turn more opaque, like real panes. No env map, no extra pass.
 */

const GLASS_PARS_VERTEX = /* glsl */ `
varying vec3 vGlassWorld;
`;

const GLASS_PARS_FRAGMENT = /* glsl */ `
uniform vec3 uGlassSky;
uniform vec3 uGlassHorizon;
uniform float uGlassFresnel;
uniform float uGlassStreak;
varying vec3 vGlassWorld;
`;

const GLASS_FRAGMENT = /* glsl */ `
{
  float facing = abs(dot(normalize(vViewPosition), normalize(normal)));
  float sheen = pow(1.0 - facing, 3.0) * uGlassFresnel;
  float bands = sin(dot(vGlassWorld, vec3(0.8, 1.9, 0.6)) * 1.1 + sin(vGlassWorld.y * 0.7 + vGlassWorld.x * 0.3) * 2.2);
  float streak = smoothstep(0.82, 1.0, bands) * uGlassStreak;
  vec3 reflection = mix(uGlassHorizon, uGlassSky, clamp(vGlassWorld.y * 0.12, 0.0, 1.0));
  gl_FragColor.rgb += reflection * (sheen + streak);
  gl_FragColor.a = clamp(gl_FragColor.a + sheen * 0.6 + streak * 0.5, 0.0, 1.0);
}
#include <dithering_fragment>
`;

export interface GlassOptions {
  color: string;
  opacity: number;
}

export function createGlassMaterial({ color, opacity }: GlassOptions): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.08,
    metalness: 0,
  });
  addSurfaceDetail(material, { scale: SOLARPUNK_GLASS.DETAIL_SCALE, normalStrength: SOLARPUNK_GLASS.DETAIL_NORMAL });
  const uniforms = {
    uGlassSky: { value: new THREE.Color(SOLARPUNK_GLASS.SKY) },
    uGlassHorizon: { value: new THREE.Color(SOLARPUNK_GLASS.HORIZON) },
    uGlassFresnel: { value: SOLARPUNK_GLASS.FRESNEL },
    uGlassStreak: { value: SOLARPUNK_GLASS.STREAK },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = GLASS_PARS_VERTEX + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvGlassWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = GLASS_PARS_FRAGMENT + shader.fragmentShader.replace('#include <dithering_fragment>', GLASS_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'solarpunk-glass';
  return material;
}
