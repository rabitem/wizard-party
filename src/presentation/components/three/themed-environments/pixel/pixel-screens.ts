import * as THREE from 'three';
import { PIXEL_SCREENS as S } from '@/presentation/config/pixel-environment.config';
import { seededRandom } from '../primitives';
import { pixelate } from './pixel-textures';

/**
 * Animated cabinet screens: one tiny canvas atlas holding four generic mini
 * games side by side (space shooter, snake, brick breaker, side-scroller).
 * Every cabinet samples its tile through remapped UVs, so all screens share a
 * single texture upload per frame.
 */

const W = S.TILE_WIDTH;
const H = S.TILE_HEIGHT;

type TilePainter = (ctx: CanvasRenderingContext2D, ox: number, tick: number) => void;

function rect(ctx: CanvasRenderingContext2D, color: string, [x, y, w, h]: readonly [number, number, number, number]): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Triangle wave bouncing between lo and hi */
function bounce(t: number, lo: number, hi: number): number {
  const span = hi - lo;
  const m = ((t % (span * 2)) + span * 2) % (span * 2);
  return Math.round(lo + (m < span ? m : span * 2 - m));
}

const STARS = (() => {
  const rand = seededRandom(11);
  return Array.from({ length: 12 }, () => [Math.floor(rand() * W), Math.floor(rand() * H), rand() < 0.3 ? 2 : 1] as const);
})();

const paintShooter: TilePainter = (ctx, ox, tick) => {
  rect(ctx, '#05061a', [ox, 0, W, H]);
  for (const [x, y, speed] of STARS) rect(ctx, speed === 2 ? '#ffffff' : '#4a5aa8', [ox + x, (y + tick * speed) % H, 1, 1]);
  const sway = bounce(tick >> 1, -3, 3);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = ox + 5 + col * 6 + sway;
      const y = 2 + row * 4;
      rect(ctx, row === 0 ? '#ff4fd8' : '#ffd93b', [x, y, 3, 2]);
      rect(ctx, '#05061a', [x + 1, y + 1, 1, 1]);
    }
  }
  const shipX = ox + bounce(tick, 3, W - 8);
  rect(ctx, '#22e5ff', [shipX, 20, 5, 2]);
  rect(ctx, '#22e5ff', [shipX + 2, 18, 1, 2]);
  rect(ctx, '#ffffff', [shipX + 2, 19 - ((tick * 3) % 14), 1, 2]);
};

const SNAKE_PATH = (() => {
  const path: [number, number][] = [];
  for (let x = 4; x < 27; x++) path.push([x, 5]);
  for (let y = 5; y < 18; y++) path.push([27, y]);
  for (let x = 27; x > 4; x--) path.push([x, 18]);
  for (let y = 18; y > 5; y--) path.push([4, y]);
  return path;
})();
const SNAKE_LENGTH = 11;

const paintSnake: TilePainter = (ctx, ox, tick) => {
  rect(ctx, '#0a2a12', [ox, 0, W, H]);
  rect(ctx, '#1f6a2e', [ox + 1, 1, W - 2, 1]);
  rect(ctx, '#1f6a2e', [ox + 1, H - 2, W - 2, 1]);
  const head = tick % SNAKE_PATH.length;
  for (let i = SNAKE_LENGTH; i >= 0; i--) {
    const [x, y] = SNAKE_PATH[(head - i + SNAKE_PATH.length) % SNAKE_PATH.length];
    const body = i % 2 === 0 ? '#4ade5a' : '#2fbf4a';
    rect(ctx, i === 0 ? '#c8ffb0' : body, [ox + x, y, 1, 1]);
  }
  if ((tick >> 2) % 2 === 0) rect(ctx, '#ff3b55', [ox + 15, 11, 2, 2]);
  rect(ctx, '#6fbf7a', [ox + 22, 2, 1, 1]);
  rect(ctx, '#6fbf7a', [ox + 24, 2, 1, 1]);
};

const BRICK_ROWS = ['#ff3b55', '#ffd93b', '#4ade5a'] as const;

const paintBreaker: TilePainter = (ctx, ox, tick) => {
  rect(ctx, '#0a0a2a', [ox, 0, W, H]);
  const cycle = (tick % 160) / 160;
  BRICK_ROWS.forEach((color, row) => {
    for (let col = 0; col < 6; col++) {
      const id = row * 6 + col;
      if (((id * 37) % 18) / 18 < cycle) continue;
      rect(ctx, color, [ox + 1 + col * 5, 2 + row * 3, 4, 2]);
    }
  });
  const bx = bounce(tick * 1.5, 1, W - 2);
  const by = bounce(tick, 12, 20);
  rect(ctx, '#ffffff', [ox + bx, by, 1, 1]);
  const paddle = Math.min(Math.max(bx - 3, 0), W - 7);
  rect(ctx, '#6fd3ff', [ox + paddle, 22, 7, 1]);
};

const GAP_PERIOD = 20;

const paintRunner: TilePainter = (ctx, ox, tick) => {
  rect(ctx, '#2a1a6a', [ox, 0, W, H]);
  rect(ctx, '#3a2a8a', [ox, 10, W, 4]);
  for (const [cx, cy, speed] of [[6, 3, 1], [22, 6, 2]] as const) {
    const x = ((cx - Math.floor(tick / (speed * 2))) % W + W) % W;
    rect(ctx, '#d8d8ff', [ox + Math.min(x, W - 5), cy, 5, 2]);
  }
  for (let x = 0; x < W; x++) {
    const phase = (x + tick) % GAP_PERIOD;
    if (phase >= 14 && phase <= 16) continue;
    rect(ctx, '#4ade5a', [ox + x, 19, 1, 1]);
    rect(ctx, x % 4 === (tick % 4) ? '#7a3a0a' : '#b85a14', [ox + x, 20, 1, 4]);
    if (phase === 15 - 6) rect(ctx, '#ffd93b', [ox + x, 12, 2, 2]);
  }
  const jump = (tick % GAP_PERIOD) - 3;
  const lift = jump >= 0 && jump <= 7 ? Math.round(Math.sin((jump / 7) * Math.PI) * 6) : 0;
  const y = 15 - lift;
  rect(ctx, '#ff4d6d', [ox + 8, y, 3, 2]);
  rect(ctx, '#f2c49b', [ox + 8, y + 2, 3, 1]);
  rect(ctx, '#2a4bd8', [ox + 8, y + 3, 3, 1]);
};

const PAINTERS: readonly TilePainter[] = [paintShooter, paintSnake, paintBreaker, paintRunner];

export interface ScreenAtlas {
  /** Crisp nearest-filtered texture for the screens */
  texture: THREE.Texture;
  /** Same canvas, linearly filtered: a soft source for floor reflections */
  reflection: THREE.Texture;
  /** Repaints every tile for an integer animation tick */
  paint: (tick: number) => void;
}

export function createScreenAtlas(): ScreenAtlas {
  const width = W * S.VARIANTS;
  if (typeof document === 'undefined') return { texture: new THREE.Texture(), reflection: new THREE.Texture(), paint: () => {} };
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  pixelate(texture);
  const reflection = new THREE.CanvasTexture(canvas);
  reflection.colorSpace = THREE.SRGBColorSpace;
  reflection.minFilter = THREE.LinearFilter;
  reflection.magFilter = THREE.LinearFilter;
  reflection.generateMipmaps = false;
  const paint = (tick: number) => {
    if (!ctx) return;
    for (let i = 0; i < S.VARIANTS; i++) PAINTERS[i % PAINTERS.length](ctx, i * W, tick);
    texture.needsUpdate = true;
    reflection.needsUpdate = true;
  };
  paint(0);
  return { texture, reflection, paint };
}

/** Plane whose UVs sample one atlas tile (so screens can be instanced per variant). */
export function createScreenGeometry(variant: number, width: number, height: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setX(i, (variant + uv.getX(i)) / S.VARIANTS);
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Floor strip reflecting one atlas tile: lies flat once rotated by its
 * placement offset, with V flipped so the bottom of the screen image sits
 * next to the cabinet and the top stretches out across the floor.
 */
export function createReflectionGeometry(variant: number, width: number, length: number): THREE.BufferGeometry {
  const geometry = createScreenGeometry(variant, width, length);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  uv.needsUpdate = true;
  return geometry;
}
