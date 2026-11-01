'use client';

/**
 * Leaf-vein suit emblems for the Solarpunk deck, drawn as botanical line art
 * centred on (0, 0) at a nominal radius of ~100px (callers scale):
 * GIANTS = lobed oak leaf, ELVES = fern frond, DWARVES = ginkgo sun fan,
 * HUMANS = five-petal bloom with veined petals.
 */

import { Suit } from '@shared/domain';
import { drawVeinedLeaf } from './solarpunk-primitives';
import { mixColor, withAlpha } from './style-shared';

export interface EmblemColors {
  ink: string;
  brass: string;
}

type EmblemPainter = (ctx: CanvasRenderingContext2D, colors: EmblemColors) => void;

const OAK_LOBES = 4;
const FERN_PAIRS = 7;
const GINKGO_VEINS = 13;
const BLOOM_PETALS = 5;
const BLOOM_SEEDS = 16;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function strokeInk(ctx: CanvasRenderingContext2D, ink: string, width: number): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Lobed oak leaf with a thick midrib and a vein into every lobe, plus an acorn */
const paintOak: EmblemPainter = (ctx, { ink, brass }) => {
  const top = -95;
  const bottom = 70;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (const side of [1, -1]) {
    if (side === -1) ctx.moveTo(0, bottom);
    for (let i = 0; i < OAK_LOBES; i++) {
      const y0 = bottom - ((i + 0.1) / OAK_LOBES) * (bottom - top) * 0.92;
      const y1 = bottom - ((i + 0.9) / OAK_LOBES) * (bottom - top) * 0.92;
      const reach = 58 * Math.sin(Math.PI * ((i + 0.6) / (OAK_LOBES + 0.4))) + 18;
      ctx.bezierCurveTo(side * reach * 0.4, y0, side * reach * 1.1, (y0 + y1) / 2 + 6, side * reach * 0.55, y1 + 2);
      ctx.quadraticCurveTo(side * reach * 0.25, y1 - 2, side * 10, y1 - 8);
    }
    ctx.quadraticCurveTo(side * 10, top + 10, 0, top);
  }
  ctx.fillStyle = withAlpha(ink, 0.22);
  ctx.fill();
  strokeInk(ctx, ink, 3.5);

  ctx.beginPath();
  ctx.moveTo(0, bottom + 22);
  ctx.lineTo(0, top + 12);
  for (let i = 0; i < OAK_LOBES; i++) {
    const y = bottom - ((i + 0.5) / OAK_LOBES) * (bottom - top) * 0.92;
    const reach = 46 * Math.sin(Math.PI * ((i + 0.6) / (OAK_LOBES + 0.4))) + 10;
    for (const side of [1, -1]) {
      ctx.moveTo(0, y + 14);
      ctx.quadraticCurveTo(side * reach * 0.4, y + 6, side * reach, y - 4);
    }
  }
  strokeInk(ctx, ink, 2);

  // Brass acorn tucked at the stem
  ctx.beginPath();
  ctx.ellipse(34, bottom + 6, 11, 14, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = brass;
  ctx.fill();
  strokeInk(ctx, ink, 1.6);
  ctx.beginPath();
  ctx.ellipse(30, bottom - 4, 12, 6, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = mixColor(brass, 'black', 0.35);
  ctx.fill();
  strokeInk(ctx, ink, 1.4);
};

/** Fern frond: curved rachis with paired veined pinnae, unfurling fiddlehead tip */
const paintFern: EmblemPainter = (ctx, { ink }) => {
  const rachis = (t: number): [number, number] => [Math.sin(t * 2.2) * 18 - 6, 90 - t * 180];
  ctx.beginPath();
  ctx.moveTo(...rachis(0));
  for (let i = 1; i <= 20; i++) ctx.lineTo(...rachis(i / 20));
  strokeInk(ctx, ink, 3.5);

  for (let i = 0; i < FERN_PAIRS; i++) {
    const t = 0.1 + (i / FERN_PAIRS) * 0.78;
    const [x, y] = rachis(t);
    const length = 70 * (1 - t * 0.75);
    for (const side of [1, -1]) {
      const angle = side > 0 ? -0.55 : Math.PI + 0.55;
      drawVeinedLeaf(ctx, { x, y }, { length, width: length * 0.28, angle }, { fill: withAlpha(ink, 0.22), ink }, 2.2);
    }
  }
  // Fiddlehead curl
  const [tx, ty] = rachis(1);
  ctx.beginPath();
  ctx.arc(tx + 8, ty, 8, Math.PI, Math.PI * 2.6);
  strokeInk(ctx, ink, 3);
};

/** Ginkgo fan radiating like a sun, brass sun disc at the stem */
const paintGinkgo: EmblemPainter = (ctx, { ink, brass }) => {
  const stem = { x: 0, y: 60 };
  const spread = 1.05;
  const radius = 120;
  ctx.beginPath();
  ctx.moveTo(stem.x, stem.y);
  ctx.arc(stem.x, stem.y, radius, -Math.PI / 2 - spread, -Math.PI / 2 + spread);
  ctx.closePath();
  ctx.fillStyle = withAlpha(ink, 0.2);
  ctx.fill();
  strokeInk(ctx, ink, 3.5);

  // Notched rim (the ginkgo's centre split) and fan veins
  ctx.beginPath();
  for (let i = 0; i <= GINKGO_VEINS; i++) {
    const a = -Math.PI / 2 - spread + (i / GINKGO_VEINS) * spread * 2;
    ctx.moveTo(stem.x + Math.cos(a) * 22, stem.y + Math.sin(a) * 22);
    ctx.lineTo(stem.x + Math.cos(a) * (radius - 6), stem.y + Math.sin(a) * (radius - 6));
  }
  strokeInk(ctx, ink, 1.6);
  ctx.beginPath();
  ctx.moveTo(stem.x, stem.y - radius);
  ctx.lineTo(stem.x, stem.y - radius + 26);
  strokeInk(ctx, ink, 3);

  // Sun disc with short rays
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.moveTo(stem.x + Math.cos(a) * 20, stem.y + 20 + Math.sin(a) * 20);
    ctx.lineTo(stem.x + Math.cos(a) * 30, stem.y + 20 + Math.sin(a) * 30);
  }
  strokeInk(ctx, brass, 3);
  ctx.beginPath();
  ctx.arc(stem.x, stem.y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = brass;
  ctx.fill();
  strokeInk(ctx, ink, 2);
};

/** Five veined petals around a brass seed head, two leaves below */
const paintBloom: EmblemPainter = (ctx, { ink, brass }) => {
  const center = { x: 0, y: -12 };
  for (const side of [1, -1]) {
    drawVeinedLeaf(ctx, { x: 0, y: 70 }, { length: 70, width: 20, angle: -Math.PI / 2 + side * 0.95 }, { fill: withAlpha(ink, 0.22), ink }, 2.2);
  }
  ctx.beginPath();
  ctx.moveTo(0, 95);
  ctx.quadraticCurveTo(8, 40, center.x, center.y);
  strokeInk(ctx, ink, 3);

  for (let i = 0; i < BLOOM_PETALS; i++) {
    const angle = -Math.PI / 2 + (i / BLOOM_PETALS) * Math.PI * 2;
    drawVeinedLeaf(ctx, center, { length: 72, width: 32, angle }, { fill: mixColor(ink, 'white', 0.82), ink }, 2.6);
  }
  ctx.beginPath();
  ctx.arc(center.x, center.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = brass;
  ctx.fill();
  strokeInk(ctx, ink, 2.2);
  // Seeds on a sunflower (golden angle) spiral
  ctx.fillStyle = mixColor(brass, 'black', 0.4);
  for (let i = 1; i <= BLOOM_SEEDS; i++) {
    const a = i * GOLDEN_ANGLE;
    const d = 4.4 * Math.sqrt(i);
    ctx.beginPath();
    ctx.arc(center.x + Math.cos(a) * d, center.y + Math.sin(a) * d, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
};

const EMBLEM_PAINTERS: Record<Suit, EmblemPainter> = {
  [Suit.GIANTS]: paintOak,
  [Suit.ELVES]: paintFern,
  [Suit.DWARVES]: paintGinkgo,
  [Suit.HUMANS]: paintBloom,
};

/** Draws the suit's emblem centred at (x, y), scaled from the ~100px design radius */
export function drawSolarpunkEmblem(
  ctx: CanvasRenderingContext2D,
  suit: Suit,
  center: { x: number; y: number },
  scale: number,
  colors: EmblemColors
): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(scale, scale);
  (EMBLEM_PAINTERS[suit] ?? paintOak)(ctx, colors);
  ctx.restore();
}
