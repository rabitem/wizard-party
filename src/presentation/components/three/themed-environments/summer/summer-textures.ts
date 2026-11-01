import * as THREE from 'three';
import { SUMMER_WIND } from '@/presentation/config/summer-environment.config';
import { createPaintedTexture, seededRandom } from '../primitives';
import { FROND } from './summer-geometry';

/**
 * Palm textures and the frond wind shader patch. Textures are light/neutral
 * so instance colours and material colours tint them.
 */

const FROND_TEXTURE = { W: 256, H: 64, LEAFLETS: 30 } as const;
const BARK_TEXTURE = { W: 64, H: 128, RINGS: 4 } as const;

/**
 * Pinnate palm frond (u = base -> tip, v = across): a rachis down the middle
 * with tapered leaflets angled towards the tip. Transparent between leaflets,
 * so the material uses alphaTest.
 */
export function createFrondTexture(): THREE.Texture {
  return createPaintedTexture(FROND_TEXTURE.W, FROND_TEXTURE.H, (ctx, w, h) => {
    const rand = seededRandom(211);
    const mid = h / 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < FROND_TEXTURE.LEAFLETS; i++) {
      const t = (i + 0.5) / FROND_TEXTURE.LEAFLETS;
      const x = t * w;
      const reach = Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) * mid * (0.85 + rand() * 0.15);
      [-1, 1].forEach((side) => {
        const tone = 200 + Math.floor(rand() * 55);
        ctx.strokeStyle = `rgb(${tone - 10},${tone},${tone - 30})`;
        ctx.lineWidth = 2.2 + rand() * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, mid);
        ctx.quadraticCurveTo(x + reach * 0.35, mid + side * reach * 0.5, x + reach * 0.6, mid + side * reach);
        ctx.stroke();
      });
    }
    ctx.strokeStyle = 'rgb(214,206,150)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  });
}

/** Palm bark: stacked leaf-scar rings with fibrous streaks (one trunk segment per repeat). */
export function createBarkTexture(): THREE.Texture {
  const texture = createPaintedTexture(BARK_TEXTURE.W, BARK_TEXTURE.H, (ctx, w, h) => {
    const rand = seededRandom(223);
    ctx.fillStyle = 'rgb(205,190,170)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,245,225' : '70,50,35'},${0.08 + rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 1, 6 + rand() * 14);
    }
    const ring = h / BARK_TEXTURE.RINGS;
    for (let r = 0; r < BARK_TEXTURE.RINGS; r++) {
      const y = r * ring;
      const gradient = ctx.createLinearGradient(0, y, 0, y + ring);
      gradient.addColorStop(0, 'rgba(60,42,28,0.75)');
      gradient.addColorStop(0.18, 'rgba(60,42,28,0.15)');
      gradient.addColorStop(0.8, 'rgba(255,240,220,0.12)');
      gradient.addColorStop(1, 'rgba(60,42,28,0.55)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, w, ring);
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Shared wind clock for every frond material (one summer room is mounted at
 * a time). PalmTrees advances it per frame; reduced motion leaves it at 0.
 */
export const FROND_WIND_UNIFORMS = { uWindTime: { value: 0 } };

/**
 * Patches a frond material so fronds sway and flutter in the vertex shader:
 * displacement grows towards the tip (position.x runs base -> tip), with a
 * per-instance phase so no two fronds move in sync. No per-frame JS beyond
 * the shared time uniform.
 */
export function applyFrondSway<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = FROND_WIND_UNIFORMS.uWindTime;
    shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      float windTip = clamp(position.x / ${FROND.LENGTH.toFixed(2)}, 0.0, 1.0);
      float windPhase = float(gl_InstanceID) * 1.7;
      #ifdef USE_INSTANCING
        windPhase += instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.23;
      #endif
      float windSway = sin(uWindTime * 1.3 + windPhase) * 0.65 + sin(uWindTime * 2.7 + windPhase * 1.3) * 0.35;
      float windBend = windTip * windTip * ${SUMMER_WIND.FROND_SWAY.toFixed(3)};
      transformed.y += windSway * windBend;
      transformed.z += windSway * windBend * 0.55;
      transformed.y += sin(uWindTime * 7.0 + position.x * 4.0 + windPhase) * ${SUMMER_WIND.FROND_FLUTTER.toFixed(3)} * windTip;`,
    );
  };
  material.customProgramCacheKey = () => 'summer-frond-sway';
  return material;
}
