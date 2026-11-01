import * as THREE from 'three';
import { HALLOWEEN_COLORS, HALLOWEEN_REALISM } from '@/presentation/config/halloween-environment.config';
import { createPaintedTexture, seededRandom } from '../primitives';

const { COBWEB } = HALLOWEEN_REALISM;
const TAU = Math.PI * 2;
/** Quarter fan hanging down from the anchor (corner webs). */
const FAN_START = -0.75 * Math.PI;
const FAN_LENGTH = Math.PI / 2;

/**
 * Full radial web painted once: a faint dusty haze, radial threads and
 * sagging capture spirals with slight jitter. The fan geometry samples only
 * its lower quarter (CircleGeometry UVs map the unit disc onto the canvas).
 */
export function createCobwebTexture(): THREE.Texture {
  const size = COBWEB.textureSize;
  return createPaintedTexture(size, size, (ctx) => {
    const rand = seededRandom(61);
    const c = size / 2;
    const haze = ctx.createRadialGradient(c, c, 0, c, c, c);
    haze.addColorStop(0, 'rgba(220,215,235,0.22)');
    haze.addColorStop(0.6, 'rgba(220,215,235,0.08)');
    haze.addColorStop(1, 'rgba(220,215,235,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, size, size);

    const angles = Array.from({ length: COBWEB.spokes }, (_, i) => (i / COBWEB.spokes) * TAU + (rand() - 0.5) * 0.06);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const angle of angles) {
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(angle) * c * 0.98, c + Math.sin(angle) * c * 0.98);
    }
    ctx.stroke();

    ctx.lineWidth = 0.8;
    for (let ring = 1; ring <= COBWEB.rings; ring++) {
      const radius = (ring / COBWEB.rings) * c * 0.95;
      ctx.globalAlpha = 0.45 + rand() * 0.4;
      ctx.beginPath();
      angles.forEach((angle, i) => {
        const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? TAU : 0);
        const mid = (angle + next) / 2;
        const sag = radius * (0.88 + rand() * 0.05);
        const r = radius * (0.97 + rand() * 0.06);
        if (i === 0) ctx.moveTo(c + Math.cos(angle) * r, c + Math.sin(angle) * r);
        ctx.quadraticCurveTo(c + Math.cos(mid) * sag, c + Math.sin(mid) * sag, c + Math.cos(next) * r, c + Math.sin(next) * r);
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Quarter fan (radius 1) hanging below its anchor point. */
export function createCobwebGeometry(): THREE.BufferGeometry {
  return new THREE.CircleGeometry(1, 10, FAN_START, FAN_LENGTH);
}

/**
 * Translucent silk: double-sided, no depth writes, mildly additive so the
 * threads catch the moon and candle light without hiding what is behind.
 */
export function createCobwebMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    color: HALLOWEEN_COLORS.cobweb,
    transparent: true,
    opacity: COBWEB.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}
