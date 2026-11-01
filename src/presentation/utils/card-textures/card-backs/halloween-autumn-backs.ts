'use client';

/** Halloween (purple night, moon, bats, pumpkin) and Autumn (russet, falling leaves, oak) card backs */

import { createSeededRandom } from '../drawing-utils';
import {
  TAU,
  drawMedallion,
  drawSeasonalFrame,
  drawVignette,
  fillLinearBackground,
  fillRadialBackground,
  forEachCorner,
  getBackCenter,
  getMedallionRadius,
  type CardBackPainter,
} from './back-shared';
import { drawAcorn, drawBat, drawCornerWeb, drawLeaf, drawMapleLeaf, drawMoon, drawPumpkin } from './motif-primitives';

const HALLOWEEN_STAR_COUNT = 46;
const HALLOWEEN_BATS: ReadonlyArray<[number, number, number]> = [
  // x, y as card fractions, size in px
  [0.24, 0.13, 26], [0.74, 0.27, 20], [0.3, 0.3, 15], [0.82, 0.12, 14], [0.6, 0.08, 11],
];
const AUTUMN_LEAF_COUNT = 30;
const PUMPKIN_STEM_COLOR = '#3f5a2a';

export const paintHalloweenBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  const random = createSeededRandom('card-back:halloween');
  const moon = { x: w * 0.5, y: h * 0.19 };
  fillRadialBackground(ctx, size, palette.base, palette.deep, moon);

  // Starry sky
  ctx.fillStyle = palette.glow;
  for (let i = 0; i < HALLOWEEN_STAR_COUNT; i++) {
    ctx.globalAlpha = 0.25 + random() * 0.55;
    ctx.beginPath();
    ctx.arc(random() * w, random() * h * 0.6, 0.8 + random() * 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawMoon(ctx, moon, 52, palette.glow, palette.deep);

  ctx.fillStyle = palette.ink;
  for (const [fx, fy, s] of HALLOWEEN_BATS) drawBat(ctx, { x: w * fx, y: h * fy }, s);

  // Graveyard hills with tombstones and a crooked tree
  const hillTop = h * 0.8;
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, hillTop + 20);
  ctx.quadraticCurveTo(w * 0.25, hillTop - 30, w * 0.5, hillTop + 6);
  ctx.quadraticCurveTo(w * 0.75, hillTop + 40, w, hillTop - 10);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  for (const [fx, tw, th] of [[0.16, 26, 40], [0.3, 20, 30], [0.68, 24, 36], [0.84, 18, 26]]) {
    const tx = w * fx;
    const ty = hillTop + 8;
    ctx.beginPath();
    ctx.moveTo(tx - tw / 2, ty);
    ctx.lineTo(tx - tw / 2, ty - th + tw / 2);
    ctx.arc(tx, ty - th + tw / 2, tw / 2, Math.PI, TAU);
    ctx.lineTo(tx + tw / 2, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.9, hillTop);
  ctx.lineTo(w * 0.88, hillTop - 80);
  ctx.lineTo(w * 0.8, hillTop - 120);
  ctx.moveTo(w * 0.88, hillTop - 70);
  ctx.lineTo(w * 0.95, hillTop - 105);
  ctx.stroke();

  // Pumpkin medallion
  const center = getBackCenter(size);
  center.y += h * 0.03;
  const inner = drawMedallion(ctx, center, getMedallionRadius(size), {
    fillInner: palette.base, fillOuter: palette.deep, metal: palette.metal, shade: palette.metalShade,
  });
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, inner);
  glow.addColorStop(0, 'rgba(255,170,60,0.45)');
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, inner, 0, TAU);
  ctx.fill();
  drawPumpkin(ctx, { x: center.x, y: center.y + inner * 0.12 }, inner * 0.68, {
    body: palette.metal, rib: palette.metalShade, stem: PUMPKIN_STEM_COLOR, face: palette.glow,
  });

  drawVignette(ctx, size, 0.35);
  drawSeasonalFrame(ctx, size, palette);

  // Spider webs in the corners
  ctx.strokeStyle = palette.glow;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  forEachCorner(size, (corner, i) => {
    drawCornerWeb(ctx, corner, 48, i % 2 === 0 ? 1 : -1, i < 2 ? 1 : -1);
  }, 30);
  ctx.globalAlpha = 1;
};

export const paintAutumnBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  const random = createSeededRandom('card-back:autumn');
  fillLinearBackground(ctx, size, [palette.base, palette.deep, palette.base]);

  // Warm harvest glow
  const warm = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, h * 0.55);
  warm.addColorStop(0, 'rgba(255,190,90,0.28)');
  warm.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  // Falling leaves pattern
  const leafColors = [palette.accent, palette.metal, palette.glow, palette.metalShade];
  for (let i = 0; i < AUTUMN_LEAF_COUNT; i++) {
    const p = { x: random() * w, y: random() * h };
    const leafSize = 12 + random() * 16;
    const angle = random() * TAU;
    const color = leafColors[i % leafColors.length];
    ctx.globalAlpha = 0.35 + random() * 0.3;
    if (i % 2 === 0) drawMapleLeaf(ctx, p, leafSize, angle, color);
    else drawLeaf(ctx, p, leafSize, angle, { color, vein: palette.deep });
  }
  ctx.globalAlpha = 1;

  drawVignette(ctx, size, 0.4);

  // Oak medallion: crossed oak leaves under an acorn
  const center = getBackCenter(size);
  const inner = drawMedallion(ctx, center, getMedallionRadius(size), {
    fillInner: palette.base, fillOuter: palette.ink, metal: palette.metal, shade: palette.metalShade,
  });
  for (const [angle, color] of [[-0.75, palette.accent], [0.75, palette.metalShade], [0, palette.metal]] as const) {
    const ox = Math.sin(angle) * inner * 0.38;
    const oy = -Math.cos(angle) * inner * 0.38;
    drawLeaf(ctx, { x: center.x + ox, y: center.y + oy }, inner * 0.5, angle, { color, vein: palette.ink });
  }
  drawAcorn(ctx, { x: center.x, y: center.y + inner * 0.22 }, inner * 0.55, palette.glow, palette.metalShade);

  drawSeasonalFrame(ctx, size, palette);

  // Acorns in the corners, maple leaves at the frame midpoints
  forEachCorner(size, (corner) => drawAcorn(ctx, corner, 20, palette.metal, palette.metalShade), 48);
  drawMapleLeaf(ctx, { x: w / 2, y: 48 }, 14, 0, palette.accent);
  drawMapleLeaf(ctx, { x: w / 2, y: h - 48 }, 14, Math.PI, palette.accent);
};
