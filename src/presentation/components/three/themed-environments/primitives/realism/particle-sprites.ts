import * as THREE from 'three';
import { PARTICLE_FIELD, type ParticleSprite } from '@/presentation/config/realism.config';

/**
 * Soft procedural point-sprite textures, painted once per sprite kind and
 * shared by every field. White/grey so the per-particle colour tints them;
 * RGB carries shading (veins, crystal highlights), alpha the silhouette.
 */
type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;

function radial(ctx: CanvasRenderingContext2D, size: number, stops: ReadonlyArray<readonly [number, string]>): void {
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

const paintSnow: Painter = (ctx, size) => {
  const half = size / 2;
  radial(ctx, size, [
    [0, 'rgba(255,255,255,1)'],
    [0.28, 'rgba(255,255,255,0.9)'],
    [0.55, 'rgba(240,246,255,0.35)'],
    [1, 'rgba(230,240,255,0)'],
  ]);
  // Faint six-armed crystalline highlight.
  ctx.save();
  ctx.translate(half, half);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 6; arm++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -half * 0.62);
    ctx.moveTo(0, -half * 0.34);
    ctx.lineTo(half * 0.12, -half * 0.46);
    ctx.moveTo(0, -half * 0.34);
    ctx.lineTo(-half * 0.12, -half * 0.46);
    ctx.stroke();
  }
  ctx.restore();
};

const paintRain: Painter = (ctx, size) => {
  // Thin vertical streak: motion-blurred drop, brighter head at the bottom.
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.92, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  const width = Math.max(1.5, size * 0.05);
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, width / 2, size / 2, 0, 0, Math.PI * 2);
  ctx.fill();
};

const paintLeaf: Painter = (ctx, size) => {
  const half = size / 2;
  ctx.save();
  ctx.translate(half, half);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -half * 0.88);
  ctx.bezierCurveTo(half * 0.75, -half * 0.5, half * 0.7, half * 0.35, 0, half * 0.72);
  ctx.bezierCurveTo(-half * 0.7, half * 0.35, -half * 0.75, -half * 0.5, 0, -half * 0.88);
  ctx.fill();
  // Shading toward one side and darker veins.
  const shade = ctx.createLinearGradient(-half, 0, half, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.18)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = shade;
  ctx.fillRect(-half, -half, size, size);
  ctx.strokeStyle = 'rgba(90,60,40,0.45)';
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(0, -half * 0.8);
  ctx.lineTo(0, half * 0.7);
  for (let i = 1; i <= 3; i++) {
    const y = -half * 0.55 + i * half * 0.32;
    ctx.moveTo(0, y);
    ctx.lineTo(half * 0.38, y - half * 0.22);
    ctx.moveTo(0, y);
    ctx.lineTo(-half * 0.38, y - half * 0.22);
  }
  ctx.stroke();
  ctx.restore();
  // Stem
  ctx.strokeStyle = 'rgba(120,80,50,0.9)';
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.moveTo(half, half + half * 0.7);
  ctx.lineTo(half, size * 0.98);
  ctx.stroke();
};

const paintPetal: Painter = (ctx, size) => {
  const half = size / 2;
  ctx.save();
  ctx.translate(half, half);
  const gradient = ctx.createRadialGradient(0, half * 0.6, 0, 0, 0, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.7, 'rgba(250,236,240,1)');
  gradient.addColorStop(1, 'rgba(235,205,215,1)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  // Teardrop with a notch at the outer tip (cherry blossom petal).
  ctx.moveTo(0, half * 0.85);
  ctx.bezierCurveTo(half * 0.8, half * 0.3, half * 0.6, -half * 0.75, half * 0.14, -half * 0.8);
  ctx.lineTo(0, -half * 0.62);
  ctx.lineTo(-half * 0.14, -half * 0.8);
  ctx.bezierCurveTo(-half * 0.6, -half * 0.75, -half * 0.8, half * 0.3, 0, half * 0.85);
  ctx.fill();
  ctx.restore();
};

const paintGlow: Painter = (ctx, size) => {
  radial(ctx, size, [
    [0, 'rgba(255,255,255,1)'],
    [0.2, 'rgba(255,255,255,0.95)'],
    [0.4, 'rgba(255,255,255,0.45)'],
    [0.7, 'rgba(255,255,255,0.1)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
};

const paintMote: Painter = (ctx, size) => {
  radial(ctx, size, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.35, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
};

const PAINTERS: Readonly<Record<ParticleSprite, Painter>> = {
  snow: paintSnow,
  rain: paintRain,
  leaf: paintLeaf,
  petal: paintPetal,
  glow: paintGlow,
  mote: paintMote,
};

const cache = new Map<ParticleSprite, THREE.Texture>();

/** Shared sprite texture for a particle sprite kind (never disposed: tiny and reused across rooms). */
export function getParticleSprite(sprite: ParticleSprite): THREE.Texture {
  const cached = cache.get(sprite);
  if (cached) return cached;
  if (typeof document === 'undefined') return new THREE.Texture();
  const size = PARTICLE_FIELD.SPRITE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) PAINTERS[sprite](ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  // gl_PointCoord has y pointing down, like the canvas.
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(sprite, texture);
  return texture;
}
