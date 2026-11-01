import * as THREE from 'three';
import { WINDOW_VIEW } from '@/presentation/config/realism.config';
import { seededRandom } from '../instancing';

/**
 * Neutral layer textures for WindowSnowView, tinted per variant in the
 * shader. R = shade (1 = snow, 0 = rock / needles), A = coverage.
 * Horizontally tileable so layers can scroll and repeat.
 */

let mountains: THREE.Texture | null = null;
const trees = new Map<'dense' | 'sparse', THREE.Texture>();
let frost: THREE.Texture | null = null;

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

function finish(canvas: HTMLCanvasElement | null, wrapS: THREE.Wrapping): THREE.Texture {
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  texture.wrapS = wrapS;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** Periodic ridge height (0..1 of the canvas height) built from integer-frequency sines. */
function ridge(u: number, seed: number): number {
  const tau = Math.PI * 2;
  return (
    0.5 +
    0.22 * Math.sin(tau * (u * 2 + seed * 0.13)) +
    0.12 * Math.sin(tau * (u * 5 + seed * 0.71)) +
    0.05 * Math.sin(tau * (u * 13 + seed * 0.37)) +
    0.02 * Math.sin(tau * (u * 31 + seed * 0.53))
  );
}

/** Distant mountain range with jagged snow caps. */
export function getMountainLayerTexture(): THREE.Texture {
  if (mountains) return mountains;
  const [width, height] = WINDOW_VIEW.LAYER_TEXTURE_SIZE;
  const surface = makeCanvas(width, height);
  if (surface) {
    const { ctx } = surface;
    const top = (x: number) => height * (1 - 0.15 - 0.75 * ridge(x / width, 3));
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 2) ctx.lineTo(x, top(x));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = 'rgb(70,70,70)';
    ctx.fill();
    // Snow caps: band below the ridge whose depth varies with a second ridge.
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= width; x += 2) {
      const depth = height * (0.1 + 0.14 * ridge(x / width, 11));
      ctx.lineTo(x, top(x) + depth);
    }
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.fill();
    // Shadowed flanks: diagonal darker strokes.
    const rand = seededRandom(5);
    ctx.strokeStyle = 'rgba(70,70,70,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 70; i++) {
      const x = rand() * width;
      const y = top(x) + rand() * height * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 12 + rand() * 30, y + 30 + rand() * 60);
      ctx.stroke();
    }
    ctx.restore();
  }
  mountains = finish(surface?.canvas ?? null, THREE.RepeatWrapping);
  return mountains;
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, base: number, treeHeight: number, lean: number): void {
  const tiers = 4;
  const halfWidth = treeHeight * 0.32;
  for (let tier = 0; tier < tiers; tier++) {
    const tierTop = base - treeHeight * (0.25 + (tier / tiers) * 0.75);
    const tierBottom = base - treeHeight * (tier / tiers) * 0.72;
    const width = halfWidth * (1 - tier / (tiers + 1));
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.beginPath();
    ctx.moveTo(x, tierTop - treeHeight * 0.08);
    ctx.lineTo(x + width, tierBottom);
    ctx.lineTo(x - width, tierBottom);
    ctx.closePath();
    ctx.fill();
    // Snow resting on the upper edges of each tier.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.2, treeHeight * 0.025);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.85, tierBottom - 1);
    ctx.lineTo(x, tierTop - treeHeight * 0.08 + 1);
    ctx.lineTo(x + width * (0.5 + ((lean + tier * 0.37) % 1) * 0.35), tierBottom - (tierBottom - tierTop) * 0.45);
    ctx.stroke();
  }
}

/** Snowy pines standing on a snow bank (bottom rows are opaque ground); dense for far forest, sparse for near trees. */
export function getTreeLayerTexture(density: 'dense' | 'sparse'): THREE.Texture {
  const cached = trees.get(density);
  if (cached) return cached;
  const [width, height] = WINDOW_VIEW.LAYER_TEXTURE_SIZE;
  const surface = makeCanvas(width, height);
  if (surface) {
    const { ctx } = surface;
    const rand = seededRandom(density === 'dense' ? 19 : 23);
    const ground = height * 0.86;
    const count = WINDOW_VIEW.TREE_COUNTS[density];
    for (let i = 0; i < count; i++) {
      const x = rand() * width;
      const treeHeight = height * (0.35 + rand() * 0.5);
      const base = ground + rand() * height * 0.04;
      const lean = rand();
      // Draw wrapped copies so the texture tiles horizontally.
      for (const offset of [-width, 0, width]) drawPine(ctx, x + offset, base, treeHeight, lean);
    }
    const bank = ctx.createLinearGradient(0, ground - 6, 0, height);
    bank.addColorStop(0, 'rgb(220,220,220)');
    bank.addColorStop(1, 'rgb(255,255,255)');
    ctx.fillStyle = bank;
    ctx.fillRect(0, ground, width, height - ground);
  }
  const texture = finish(surface?.canvas ?? null, THREE.RepeatWrapping);
  trees.set(density, texture);
  return texture;
}

/** Frost creeping in from the glass edges: soft vignette plus branching dendrites. */
export function getFrostTexture(): THREE.Texture {
  if (frost) return frost;
  const size = WINDOW_VIEW.FROST_TEXTURE_SIZE;
  const surface = makeCanvas(size, size);
  if (surface) {
    const { ctx } = surface;
    const half = size / 2;
    const vignette = ctx.createRadialGradient(half, half, size * 0.28, half, half, size * 0.72);
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(0.55, 'rgba(255,255,255,0.12)');
    vignette.addColorStop(0.85, 'rgba(255,255,255,0.45)');
    vignette.addColorStop(1, 'rgba(255,255,255,0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);
    const rand = seededRandom(31);
    ctx.lineCap = 'round';
    const branch = (x: number, y: number, angle: number, length: number, depth: number) => {
      if (depth <= 0 || length < 2) return;
      const ex = x + Math.cos(angle) * length;
      const ey = y + Math.sin(angle) * length;
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + depth * 0.06})`;
      ctx.lineWidth = depth * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      branch(ex, ey, angle + (rand() - 0.5) * 0.5, length * 0.82, depth - 1);
      if (rand() < 0.7) branch(ex, ey, angle + (rand() > 0.5 ? 1 : -1) * (0.6 + rand() * 0.5), length * 0.55, depth - 1);
    };
    for (let i = 0; i < 26; i++) {
      // Seed on a random edge, grow toward the centre.
      const side = Math.floor(rand() * 4);
      const along = rand() * size;
      const x = [0, size, along, along][side];
      const y = [along, along, 0, size][side];
      const angle = Math.atan2(half - y, half - x) + (rand() - 0.5) * 0.9;
      branch(x, y, angle, size * (0.03 + rand() * 0.04), 6);
    }
  }
  frost = finish(surface?.canvas ?? null, THREE.ClampToEdgeWrapping);
  return frost;
}
