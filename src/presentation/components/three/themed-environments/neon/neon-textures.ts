import * as THREE from 'three';
import { NEON_COLORS, NEON_SKY_STOPS, NEON_SUN_STOPS } from '@/presentation/config/neon-environment.config';
import { createPaintedTexture, fillVerticalGradient, seededRandom } from '../primitives';

const STAR_COUNT = 140;
const SUN_STRIPES = 7;
const WINDOW_GRID = { COLS: 8, ROWS: 24, LIT_CHANCE: 0.34 } as const;

function repeatWrap(texture: THREE.Texture, repeat: [number, number]): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  return texture;
}

/** Night sky gradient with a scatter of stars in the upper half. */
export function createNeonSkyTexture(): THREE.Texture {
  return createPaintedTexture(512, 256, (ctx, w, h) => {
    fillVerticalGradient(ctx, w, h, NEON_SKY_STOPS);
    const rand = seededRandom(91);
    for (let i = 0; i < STAR_COUNT; i++) {
      const y = rand() * h * 0.6;
      ctx.globalAlpha = 0.35 + rand() * 0.6 * (1 - y / h);
      ctx.fillStyle = rand() > 0.8 ? '#ffd6f6' : '#ffffff';
      ctx.fillRect(rand() * w, y, rand() > 0.9 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  });
}

/**
 * Retro sun: hot gradient disc whose lower half is cut by horizontal gaps
 * that widen towards the bottom (painted transparent, used with alphaTest).
 */
export function createNeonSunTexture(): THREE.Texture {
  return createPaintedTexture(256, 256, (ctx, w, h) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    fillVerticalGradient(ctx, w, h, NEON_SUN_STOPS);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < SUN_STRIPES; i++) {
      const t = i / SUN_STRIPES;
      const y = h * (0.5 + t * 0.48);
      ctx.fillRect(0, y, w, 2 + t * 14);
    }
    ctx.restore();
  });
}

/** Glowing magenta grid lines on transparent black (tiles via repeat). */
export function createSynthGridTexture(repeat: [number, number]): THREE.Texture {
  const texture = createPaintedTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#05020c';
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = NEON_COLORS.gridLine;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = NEON_COLORS.gridGlow;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = NEON_COLORS.gridLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  });
  texture.anisotropy = 8;
  return repeatWrap(texture, repeat);
}

/** Faint cyan grid seams on the roof membrane (used as an emissive map). */
export function createDeckGridTexture(repeat: number): THREE.Texture {
  const texture = createPaintedTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(34,229,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
    ctx.fillStyle = 'rgba(255,63,210,0.7)';
    ctx.fillRect(0, 0, 3, 3);
  });
  return repeatWrap(texture, [repeat, repeat]);
}

/** Dark facade with a seeded pattern of lit windows (used as emissive map). */
export function createWindowTexture(): THREE.Texture {
  const { COLS, ROWS, LIT_CHANCE } = WINDOW_GRID;
  return createPaintedTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const rand = seededRandom(404);
    const cellW = w / COLS;
    const cellH = h / ROWS;
    const tints = [NEON_COLORS.windowWarm, NEON_COLORS.windowCool, NEON_COLORS.windowPink];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (rand() > LIT_CHANCE) continue;
        ctx.globalAlpha = 0.45 + rand() * 0.55;
        ctx.fillStyle = tints[Math.floor(rand() * tints.length)];
        ctx.fillRect(col * cellW + 3, row * cellH + 3, cellW - 6, cellH - 5);
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** Vertical fade (bright at v=1) for wet-floor reflection streaks. */
export function createStreakTexture(): THREE.Texture {
  return createPaintedTexture(16, 128, (ctx, w, h) => {
    const vertical = ctx.createLinearGradient(0, 0, 0, h);
    vertical.addColorStop(0, 'rgba(255,255,255,0.95)');
    vertical.addColorStop(0.35, 'rgba(255,255,255,0.4)');
    vertical.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    const horizontal = ctx.createLinearGradient(0, 0, w, 0);
    horizontal.addColorStop(0, 'rgba(0,0,0,0)');
    horizontal.addColorStop(0.5, 'rgba(0,0,0,1)');
    horizontal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Horizontal scanlines for the hologram overlay (scrolled via offset). */
export function createScanlineTexture(): THREE.Texture {
  const texture = createPaintedTexture(4, 64, (ctx, w, h) => {
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = y % 16 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, y, w, 1);
    }
  });
  return repeatWrap(texture, [1, 6]);
}

function strokeGlow(ctx: CanvasRenderingContext2D, color: string, width: number, draw: () => void): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  draw();
  ctx.restore();
}

function paintBillboardFrame(ctx: CanvasRenderingContext2D, w: number, h: number, edge: string): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(40,10,70,0.75)');
  bg.addColorStop(1, 'rgba(8,30,60,0.55)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  strokeGlow(ctx, edge, 6, () => ctx.strokeRect(10, 10, w - 20, h - 20));
}

interface TextSpec {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

function paintText(ctx: CanvasRenderingContext2D, { text, x, y, size, color }: TextSpec): void {
  ctx.save();
  ctx.font = `bold ${size}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeText(text, x, y);
  ctx.restore();
}

/** Hologram ad: a wizard hat with sparkles and a tagline. */
function paintSpellBillboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  paintBillboardFrame(ctx, w, h, NEON_COLORS.cyan);
  const cx = w * 0.25;
  const base = h * 0.78;
  strokeGlow(ctx, NEON_COLORS.magenta, 7, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 70, base);
    ctx.lineTo(cx + 70, base);
    ctx.moveTo(cx - 45, base);
    ctx.quadraticCurveTo(cx - 10, h * 0.45, cx + 25, h * 0.18);
    ctx.quadraticCurveTo(cx + 20, h * 0.5, cx + 45, base);
    ctx.stroke();
  });
  strokeGlow(ctx, NEON_COLORS.amber, 4, () => {
    for (const [sx, sy, r] of [[cx + 70, h * 0.28, 12], [cx - 60, h * 0.32, 9], [cx + 85, h * 0.6, 7]]) {
      ctx.beginPath();
      ctx.moveTo(sx - r, sy);
      ctx.lineTo(sx + r, sy);
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx, sy + r);
      ctx.stroke();
    }
  });
  paintText(ctx, { text: 'CAST', x: w * 0.68, y: h * 0.36, size: 70, color: NEON_COLORS.cyan });
  paintText(ctx, { text: 'THE NIGHT', x: w * 0.68, y: h * 0.64, size: 44, color: NEON_COLORS.magenta });
}

/** Hologram ad: four outlined suit glyphs and a "PLAY" banner. */
function paintCardsBillboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  paintBillboardFrame(ctx, w, h, NEON_COLORS.magenta);
  const glyphs: Array<[string, string]> = [
    ['⚡', NEON_COLORS.cyan],
    ['◆', NEON_COLORS.magenta],
    ['⚙', NEON_COLORS.amber],
    ['♥', NEON_COLORS.mint],
  ];
  glyphs.forEach(([glyph, color], i) => paintText(ctx, { text: glyph, x: w * (0.2 + i * 0.2), y: h * 0.38, size: 64, color }));
  paintText(ctx, { text: 'PLAY TONIGHT', x: w / 2, y: h * 0.74, size: 48, color: NEON_COLORS.cyan });
}

export function createBillboardTexture(variant: 'spell' | 'cards'): THREE.Texture {
  return createPaintedTexture(512, 288, variant === 'spell' ? paintSpellBillboard : paintCardsBillboard);
}
