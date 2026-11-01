import { createRandom, lerp } from '../particle';
import { createSpriteCanvas, rgba, shade, type Rgb, type SpriteImage } from './canvas';

/** Bat sprites are authored in a 64 x 32 box, body centred at x 32. */
const BAT_W = 64;
const BAT_H = 32;
const BAT_CX = 32;
/** Vertical wing travel (units) between fully up and fully down. */
const WING_TRAVEL = 12;

/** Fog sprites: fixed resolution (they are drawn huge and soft, so upscaling is invisible). */
const FOG_W = 256;
const FOG_H = 128;
const FOG_PUFFS = 18;
const FOG_SEED = 911;

/** One wing (side = 1 right, -1 left) for a wing lift of -1 (down) .. 1 (up). */
function traceWing(ctx: CanvasRenderingContext2D, side: number, lift: number): void {
  const x = (dx: number) => BAT_CX + dx * side;
  const tipY = 14 - WING_TRAVEL * lift;
  const span = 29 - 4 * Math.abs(lift);
  const wristY = 12 - 6 * lift;
  const trailing: [number, number][] = [
    [x(21), 15 - 7 * lift],
    [x(12), 16 - 3.5 * lift],
    [x(4), 17],
  ];
  ctx.moveTo(x(3), 12);
  ctx.quadraticCurveTo(x(10), 9 - 6 * lift, x(15), wristY);
  ctx.lineTo(x(span), tipY);
  let [px, py] = [x(span), tipY];
  for (const [tx, ty] of trailing) {
    // Scalloped membrane: each edge segment bows in towards the wing.
    ctx.quadraticCurveTo((px + tx) / 2, Math.min(py, ty) - 2.5, tx, ty);
    [px, py] = [tx, ty];
  }
  ctx.closePath();
}

/** One flap frame of a bat silhouette with a faint rim so it reads on dark skies. */
export function drawBatFrame(rgb: Rgb, res: number, frame: number, frames: number): SpriteImage {
  const scale = res / BAT_W;
  const { canvas, ctx } = createSpriteCanvas(res, BAT_H * scale);
  ctx.scale(scale, scale);
  const lift = Math.cos((frame / frames) * Math.PI * 2);
  ctx.beginPath();
  traceWing(ctx, 1, lift);
  traceWing(ctx, -1, lift);
  ctx.ellipse(BAT_CX, 15, 3.2, 5, 0, 0, Math.PI * 2);
  ctx.moveTo(BAT_CX + 2.6, 9.5);
  ctx.arc(BAT_CX, 9.5, 2.6, 0, Math.PI * 2);
  for (const side of [-1, 1]) {
    ctx.moveTo(BAT_CX + 1.7 * side, 8);
    ctx.lineTo(BAT_CX + 2.4 * side, 4.8);
    ctx.lineTo(BAT_CX + 0.6 * side, 7.4);
  }
  ctx.fillStyle = rgba(rgb, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(shade(rgb, 0.35), 0.5);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  return { image: canvas, w: 1, h: BAT_H / BAT_W };
}

/** Fog wisp: overlapping soft puffs inside an ellipse, fully transparent at the edges. */
export function drawFog(rgb: Rgb, variant: number): SpriteImage {
  const { canvas, ctx } = createSpriteCanvas(FOG_W, FOG_H);
  const rng = createRandom(FOG_SEED + variant * 7919);
  // Author in a square space squashed to 2:1.
  ctx.scale(1, FOG_H / FOG_W);
  const size = FOG_W;
  const light = shade(rgb, 0.15);
  for (let i = 0; i < FOG_PUFFS; i++) {
    const cx = lerp(0.2, 0.8, rng()) * size;
    const cy = lerp(0.4, 0.6, rng()) * size;
    const room = Math.min(cx, size - cx, cy, size - cy);
    const r = Math.min(room, lerp(0.12, 0.3, rng()) * size);
    const peak = lerp(0.12, 0.28, rng());
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const tone = i % 3 === 0 ? light : rgb;
    gradient.addColorStop(0, rgba(tone, peak));
    gradient.addColorStop(0.5, rgba(tone, peak * 0.55));
    gradient.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  return { image: canvas, w: 1, h: FOG_H / FOG_W };
}
