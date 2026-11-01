import { createSpriteCanvas, rgba, shade, type Rgb, type SpriteImage } from './canvas';

/** Shapes are authored in a 24-unit box, tip up, stem at the bottom. */
const UNIT = 24;

/** Leaf silhouettes: maple, elm, oak. */
const LEAF_PATHS = [
  'M12 1l1.6 4.2 3-1.6-.8 4.6 4.6-.9-2.3 3.4 3 1.2-4.6 2.3.9 2.6-4.2-.8L13 20h-2l-.2-4-4.2.8.9-2.6-4.6-2.3 3-1.2-2.3-3.4 4.6.9-.8-4.6 3 1.6z',
  'M12 2c3 2 5.5 5 5.5 9 0 4.5-2.6 7.6-5.5 9.6-2.9-2-5.5-5.1-5.5-9.6 0-4 2.5-7 5.5-9z',
  'M12 2c1.5 1 2.2 2.4 1.6 3.6 1.6-.4 2.8.6 2.4 2-.2.8-1 1.2-1.6 1.4 1.8.2 2.8 1.4 2.2 2.8-.4 1-1.6 1.2-2.4 1 1.4.8 1.8 2.2.8 3.2-.8.8-2 .6-2.6 0L12 20.5l-.4-4.5c-.6.6-1.8.8-2.6 0-1-1-.6-2.4.8-3.2-.8.2-2 0-2.4-1-.6-1.4.4-2.6 2.2-2.8-.6-.2-1.4-.6-1.6-1.4-.4-1.4.8-2.4 2.4-2-.6-1.2.1-2.6 1.6-3.6z',
] as const;

/** Petal silhouettes: notched cherry petal, rounded petal. */
const PETAL_PATHS = [
  'M12 22c-4-2.5-7-6.5-6-11 .7-3.2 2.8-6 4.6-8l1.4 1.8L13.4 3c1.8 2 3.9 4.8 4.6 8 1 4.5-2 8.5-6 11z',
  'M12 22c-4.5-3-6.5-7-5.5-11.5C7.3 6.5 9.6 3 12 2c2.4 1 4.7 4.5 5.5 8.5 1 4.5-1 8.5-5.5 11.5z',
] as const;

/** Side vein pairs of a leaf: [y on the midrib, x reach, y end]. */
const LEAF_VEINS = [
  [16, 4.5, 12.5],
  [12.5, 4.5, 9],
  [9, 3.5, 6],
] as const;

/** Dandelion pappus: filament count, fan spread and length (units). */
const SEED_FILAMENTS = 13;
const SEED_FAN = Math.PI * 0.85;
const SEED_FILAMENT_LENGTH = 7;

const SPRITE_SHAPE = { w: 1, h: 1 } as const;

function unitCanvas(res: number) {
  const { canvas, ctx } = createSpriteCanvas(res, res);
  ctx.scale(res / UNIT, res / UNIT);
  ctx.lineCap = 'round';
  return { canvas, ctx };
}

/** Leaf: shaded silhouette with a darker blotch, midrib, side veins and stem. */
export function drawLeaf(rgb: Rgb, res: number, shape: number): SpriteImage {
  const { canvas, ctx } = unitCanvas(res);
  const path = new Path2D(LEAF_PATHS[shape % LEAF_PATHS.length]);
  const body = ctx.createLinearGradient(4, 2, 20, 22);
  body.addColorStop(0, rgba(shade(rgb, 0.2), 1));
  body.addColorStop(0.55, rgba(rgb, 1));
  body.addColorStop(1, rgba(shade(rgb, -0.25), 1));
  ctx.fillStyle = body;
  ctx.fill(path);

  // Age blotch, clipped to the leaf.
  ctx.save();
  ctx.clip(path);
  const blotchX = 8 + (shape * 5) % 8;
  const blotch = ctx.createRadialGradient(blotchX, 10, 0, blotchX, 10, 6);
  blotch.addColorStop(0, rgba(shade(rgb, -0.45), 0.35));
  blotch.addColorStop(1, rgba(shade(rgb, -0.45), 0));
  ctx.fillStyle = blotch;
  ctx.fillRect(0, 0, UNIT, UNIT);
  ctx.restore();

  ctx.strokeStyle = rgba(shade(rgb, -0.4), 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(12, 23.5);
  ctx.lineTo(12, 4);
  for (const [y, reach, end] of LEAF_VEINS) {
    ctx.moveTo(12, y);
    ctx.lineTo(12 - reach, end);
    ctx.moveTo(12, y);
    ctx.lineTo(12 + reach, end);
  }
  ctx.stroke();
  return { image: canvas, ...SPRITE_SHAPE };
}

/** Petal: deeper at the base, pale at the tip, with faint veins. */
export function drawPetal(rgb: Rgb, res: number, shape: number): SpriteImage {
  const { canvas, ctx } = unitCanvas(res);
  const path = new Path2D(PETAL_PATHS[shape % PETAL_PATHS.length]);
  const body = ctx.createRadialGradient(12, 22, 0, 12, 22, 20);
  body.addColorStop(0, rgba(shade(rgb, -0.15), 1));
  body.addColorStop(0.5, rgba(rgb, 1));
  body.addColorStop(1, rgba(shade(rgb, 0.4), 1));
  ctx.fillStyle = body;
  ctx.fill(path);
  ctx.strokeStyle = rgba(shade(rgb, -0.3), 0.18);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(12, 21);
  ctx.lineTo(12, 6);
  ctx.moveTo(12, 21);
  ctx.quadraticCurveTo(9, 13, 9.5, 7);
  ctx.moveTo(12, 21);
  ctx.quadraticCurveTo(15, 13, 14.5, 7);
  ctx.stroke();
  return { image: canvas, ...SPRITE_SHAPE };
}

/** Dandelion seed: dark achene, thin stalk and a fan of fine filaments. */
export function drawSeed(rgb: Rgb, res: number): SpriteImage {
  const { canvas, ctx } = unitCanvas(res);
  const top = 9;
  const halo = ctx.createRadialGradient(12, top - 2, 0, 12, top - 2, 8);
  halo.addColorStop(0, rgba(rgb, 0.25));
  halo.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, UNIT, UNIT);

  ctx.strokeStyle = rgba(rgb, 0.85);
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  for (let i = 0; i < SEED_FILAMENTS; i++) {
    const angle = -Math.PI / 2 - SEED_FAN / 2 + (SEED_FAN * i) / (SEED_FILAMENTS - 1);
    ctx.moveTo(12, top);
    ctx.lineTo(12 + Math.cos(angle) * SEED_FILAMENT_LENGTH, top + Math.sin(angle) * SEED_FILAMENT_LENGTH);
  }
  ctx.moveTo(12, top);
  ctx.lineTo(12, 20);
  ctx.stroke();

  ctx.fillStyle = rgba(shade(rgb, -0.55), 0.9);
  ctx.beginPath();
  ctx.ellipse(12, 21, 0.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  return { image: canvas, ...SPRITE_SHAPE };
}
