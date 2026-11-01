/**
 * Canvas painters for the manga and pixel billboards / decals: the comic
 * starburst with BAM!/POW! lettering, ink splatter and the pixel "+1".
 */

import { LAND_FX_COLORS } from '../land-fx.constants';
import { createRng } from '../land-fx-selection';

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const MANGA = LAND_FX_COLORS.manga;
const PIXEL = LAND_FX_COLORS.pixel;
const BURST_SPIKES = 14;

function starburstPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number): void {
  const rand = createRng(7);
  ctx.beginPath();
  for (let i = 0; i < BURST_SPIKES * 2; i++) {
    const a = (i / (BURST_SPIKES * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer * (0.82 + rand() * 0.18) : inner * (0.9 + rand() * 0.1);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.82;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Yellow starburst, red inner burst, chunky outlined lettering. */
export function createBurstPainter(word: string): Painter {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.lineJoin = 'miter';
    starburstPath(ctx, cx, cy, w * 0.48, w * 0.3);
    ctx.fillStyle = MANGA.burstFill;
    ctx.fill();
    ctx.lineWidth = w * 0.025;
    ctx.strokeStyle = MANGA.burstOutline;
    ctx.stroke();
    starburstPath(ctx, cx, cy, w * 0.34, w * 0.22);
    ctx.fillStyle = MANGA.burstAccent;
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12);
    ctx.font = `900 ${Math.round(w * 0.2)}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = w * 0.035;
    ctx.strokeStyle = MANGA.burstOutline;
    ctx.strokeText(word, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, 0, 0);
    ctx.restore();
  };
}

/** Irregular ink blot with satellite droplets. */
export const paintInkSplat: Painter = (ctx, w, h) => {
  const rand = createRng(31);
  const cx = w / 2;
  const cy = h / 2;
  ctx.fillStyle = MANGA.ink;
  ctx.beginPath();
  const lobes = 11;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = w * (0.2 + rand() * 0.12);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(cx + Math.cos(a - 0.3) * r * 1.35, cy + Math.sin(a - 0.3) * r * 1.35, x, y);
  }
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const d = w * (0.3 + rand() * 0.17);
    const r = w * (0.012 + rand() * 0.035);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Blocky "+1" built from a 3x5 pixel font with a drop shadow. */
export const paintPlusOne: Painter = (ctx, w, h) => {
  const glyphs = [
    ['000', '010', '111', '010', '000'], // +
    ['010', '110', '010', '010', '111'], // 1
  ];
  const cell = Math.floor(Math.min(w / 8, h / 6));
  const ox = Math.floor((w - cell * 7) / 2);
  const oy = Math.floor((h - cell * 5) / 2);
  const draw = (color: string, dx: number, dy: number) => {
    ctx.fillStyle = color;
    glyphs.forEach((rows, g) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '1') ctx.fillRect(ox + (g * 4 + x) * cell + dx, oy + y * cell + dy, cell, cell);
        }
      });
    });
  };
  draw(PIXEL.textShadow, Math.max(1, cell / 3), Math.max(1, cell / 3));
  draw(PIXEL.text, 0, 0);
};
