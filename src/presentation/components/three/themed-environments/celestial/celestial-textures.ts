import type * as THREE from 'three';
import { CELESTIAL_COLORS as C, CELESTIAL_DOME, CELESTIAL_LAYOUT } from '@/presentation/config/celestial-environment.config';
import { createPaintedTexture, fillVerticalGradient, seededRandom } from '../primitives';
import { paintMilkyWay } from './milky-way-paint';

const TAU = Math.PI * 2;

interface Blob {
  x: number;
  y: number;
  r: number;
}

function softBlob(ctx: CanvasRenderingContext2D, { x, y, r }: Blob, color: string, alpha: number): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  ctx.globalAlpha = alpha;
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/**
 * Inside of the observatory dome: midnight gradient, violet/blue nebulae,
 * the milky way band, hundreds of faint background stars and faint gilded
 * meridian / declination lines (the bright twinkling stars are GPU points).
 * Canvas top = dome apex, bottom = the dome rim.
 */
export function createSkyTexture(): THREE.Texture {
  const [width, height] = CELESTIAL_DOME.SKY_TEXTURE;
  return createPaintedTexture(width, height, (ctx, w, h) => {
    const rand = seededRandom(91);
    fillVerticalGradient(ctx, w, h, [
      [0, C.skyTop],
      [0.7, '#0c1040'],
      [1, C.skyHorizon],
    ]);
    for (let i = 0; i < 7; i++) {
      softBlob(ctx, { x: rand() * w, y: h * (0.25 + rand() * 0.65), r: 60 + rand() * 120 }, i % 2 ? C.nebula : C.nebulaBlue, 0.22);
    }
    paintMilkyWay(ctx, w, h, rand);

    // Gilded celestial grid
    ctx.strokeStyle = C.gold;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * w;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (const y of [h * 0.33, h * 0.66]) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Stars: mostly pinpricks, a few bright ones with a soft halo
    for (let i = 0; i < CELESTIAL_DOME.STAR_COUNT; i++) {
      const x = rand() * w;
      // Bias towards the apex where the canvas is compressed onto the dome
      const y = Math.pow(rand(), 1.3) * h;
      const bright = rand();
      const r = bright > 0.97 ? 2.2 : 0.5 + bright * 1.1;
      ctx.fillStyle = rand() > 0.5 ? C.starWarm : C.starCool;
      ctx.globalAlpha = 0.45 + bright * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      if (bright > 0.97) softBlob(ctx, { x, y, r: 9 }, C.starWarm, 0.35);
    }
    ctx.globalAlpha = 1;
  });
}

function goldRing(ctx: CanvasRenderingContext2D, c: number, r: number, width: number, alpha = 1): void {
  ctx.strokeStyle = C.gold;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fourPointStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.32;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Inlaid zodiac medallion for the floor under the table: navy marble, gilded
 * rings, twelve sectors with star marks and a ring of moon phases.
 */
export function createZodiacTexture(): THREE.Texture {
  const size = CELESTIAL_LAYOUT.ZODIAC_TEXTURE;
  return createPaintedTexture(size, size, (ctx) => {
    const rand = seededRandom(17);
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, '#1e2660');
    grad.addColorStop(0.8, '#121844');
    grad.addColorStop(1, '#0a0e2c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, TAU);
    ctx.fill();

    // Marble veins
    ctx.strokeStyle = 'rgba(160,170,230,0.08)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(rand() * size, rand() * size);
      ctx.bezierCurveTo(rand() * size, rand() * size, rand() * size, rand() * size, rand() * size, rand() * size);
      ctx.stroke();
    }

    goldRing(ctx, c, c - 6, 6);
    goldRing(ctx, c, c - 18, 2);
    goldRing(ctx, c, c * 0.74, 3);
    goldRing(ctx, c, c * 0.6, 1.5, 0.6);

    // Twelve sectors between the outer band rings, each with a star mark
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.moveTo(c + Math.cos(a) * c * 0.74, c + Math.sin(a) * c * 0.74);
      ctx.lineTo(c + Math.cos(a) * (c - 18), c + Math.sin(a) * (c - 18));
    }
    ctx.stroke();
    ctx.fillStyle = C.gold;
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * TAU;
      const r = c * 0.86;
      fourPointStar(ctx, c + Math.cos(a) * r, c + Math.sin(a) * r, i % 3 === 0 ? 14 : 9);
    }

    // Moon phases between the inner rings
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const x = c + Math.cos(a) * c * 0.67;
      const y = c + Math.sin(a) * c * 0.67;
      ctx.fillStyle = '#efe0b0';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#121844';
      ctx.beginPath();
      ctx.arc(x + Math.cos((i / 8) * TAU) * 10, y, 10, 0, TAU);
      ctx.fill();
    }
  });
}

/** Grey horizontal bands for gas-giant planets (tinted per instance). */
export function createPlanetBandTexture(): THREE.Texture {
  return createPaintedTexture(128, 64, (ctx, w, h) => {
    const rand = seededRandom(5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2 + Math.floor(rand() * 5)) {
      const shade = Math.floor(170 + rand() * 85);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, w, 1 + rand() * 4);
    }
  });
}

/** Concentric bands for planetary rings; RingGeometry UVs are planar, so a square radial paint lines up. */
export function createRingTexture(): THREE.Texture {
  return createPaintedTexture(256, 256, (ctx, w) => {
    const rand = seededRandom(23);
    const c = w / 2;
    for (let r = c; r > 0; r -= 2 + rand() * 4) {
      const v = Math.floor(150 + rand() * 105);
      ctx.fillStyle = `rgba(${v},${v},${v},${0.35 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, TAU);
      ctx.fill();
    }
  });
}
