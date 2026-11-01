import * as THREE from 'three';
import { CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import { directionToSkyUv, getMilkyWayBasis, milkyWayPoint } from './celestial-geometry';

const { MILKY_WAY } = CELESTIAL_REALISM;
/** Below this elevation the band is hidden by the dome rim. */
const MIN_HEIGHT = 0.02;
/** Near the apex the canvas is squeezed horizontally; cap the stretch. */
const MAX_STRETCH = 5;

interface Blob {
  x: number;
  y: number;
  radius: number;
  /** Horizontal stretch (compensates the canvas squeeze near the apex) */
  stretch: number;
  color: string;
  alpha: number;
}

function blob(ctx: CanvasRenderingContext2D, { x, y, radius, stretch, color, alpha }: Blob) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretch, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/**
 * Paints the milky way into the dome sky canvas: soft glowing clouds along
 * the tilted great circle plus a darker dust rift down its middle. Uses the
 * same basis as the GPU starfield, so the dense star band sits on the glow.
 */
export function paintMilkyWay(ctx: CanvasRenderingContext2D, width: number, height: number, rand: () => number): void {
  const basis = getMilkyWayBasis();
  const point = new THREE.Vector3();
  const pxPerRadian = height / (Math.PI / 2);

  const stamp = (offset: number, angle: number, radians: number, color: string, alpha: number) => {
    milkyWayPoint(basis, angle, offset, point);
    if (point.y < MIN_HEIGHT) return;
    const [u, t] = directionToSkyUv(point);
    const x = u * width;
    const y = t * height;
    const radius = radians * pxPerRadian;
    // Columns converge at the apex: widen horizontally by 1 / sin(polar angle).
    const stretch = Math.min(MAX_STRETCH, 1 / Math.max(Math.sin(t * (Math.PI / 2)), 1 / MAX_STRETCH));
    for (const shift of [-width, 0, width]) {
      const sx = x + shift;
      if (sx + radius * stretch < 0 || sx - radius * stretch > width) continue;
      blob(ctx, { x: sx, y, radius, stretch, color, alpha });
    }
  };

  for (let i = 0; i < MILKY_WAY.GLOW_BLOBS; i++) {
    const angle = rand() * Math.PI * 2;
    const offset = (rand() + rand() - 1) * MILKY_WAY.WIDTH;
    const color = MILKY_WAY.GLOW_COLORS[i % MILKY_WAY.GLOW_COLORS.length];
    stamp(offset, angle, MILKY_WAY.WIDTH * (0.5 + rand() * 0.9), color, 0.05 + rand() * 0.05);
  }
  // Dust rift: thin dark lanes slightly off the centre line
  for (let i = 0; i < MILKY_WAY.GLOW_BLOBS / 3; i++) {
    const angle = rand() * Math.PI * 2;
    stamp((rand() - 0.4) * MILKY_WAY.WIDTH * 0.35, angle, MILKY_WAY.WIDTH * (0.15 + rand() * 0.2), MILKY_WAY.DUST_COLOR, 0.12);
  }
  ctx.globalAlpha = 1;
}
