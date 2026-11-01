/**
 * Shared point-sprite shader: per-particle colour, size, alpha, rotation and
 * a horizontal "flip" squash that fakes a tumbling leaf. One material per
 * (texture, blending) pair is cached for the whole page.
 */

import * as THREE from 'three';
import { getFxTexture, type FxTextureId } from '../textures';

export type FxBlending = 'normal' | 'additive';

const VERTEX = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aRot;
attribute float aFlip;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
varying float vFlip;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vRot = aRot;
  vFlip = aFlip;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aAlpha > 0.003 ? aSize * uScale / max(-mv.z, 0.001) : 0.0;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
varying float vFlip;
void main() {
  vec2 p = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
  float c = cos(vRot);
  float s = sin(vRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p.x /= vFlip;
  vec2 uv = p + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 tex = texture2D(uMap, uv);
  float a = tex.a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(tex.rgb * vColor, a);
  #include <colorspace_fragment>
}
`;

/** Shared projection scale (drawing-buffer height / 2), like PointsMaterial. */
const scaleUniform = { value: 400 };
const bufferSize = new THREE.Vector2();

const materials = new Map<string, THREE.ShaderMaterial>();

export function getPointSpriteMaterial(texture: FxTextureId, blending: FxBlending): THREE.ShaderMaterial {
  const key = `${texture}:${blending}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: getFxTexture(texture) }, uScale: scaleUniform },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  if (typeof document !== 'undefined') materials.set(key, material);
  return material;
}

/** Keeps uScale in sync with the canvas; attach as Points.onBeforeRender. */
export function syncPointScale(renderer: THREE.WebGLRenderer): void {
  renderer.getDrawingBufferSize(bufferSize);
  scaleUniform.value = bufferSize.y / 2;
}
