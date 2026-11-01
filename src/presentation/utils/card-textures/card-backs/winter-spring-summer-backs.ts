'use client';

/** Winter (icy snowflake lattice, star), Spring (blossoms, petals, flower) and Summer (waves, sand, sun) card backs */

import { createSeededRandom, drawStar } from '../drawing-utils';
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
import { drawFlower, drawLeaf, drawPetal, drawSnowflake, drawSun, drawWaveRow } from './motif-primitives';

const WINTER_LATTICE_STEP = 64;
const WINTER_ICICLE_COUNT = 14;
const SPRING_PETAL_COUNT = 40;
const SPRING_BLOSSOM_COUNT = 9;
const SUMMER_WAVE_ROW_GAP = 34;
const SUMMER_SAND_START = 0.8;
const SUMMER_STARFISH_COLOR = '#ff7a5c';

export const paintWinterBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  fillRadialBackground(ctx, size, palette.base, palette.deep);

  // Diamond lattice with a snowflake on every crossing
  ctx.strokeStyle = palette.glow;
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let d = -h; d < w + h; d += WINTER_LATTICE_STEP) {
    ctx.moveTo(d, 0);
    ctx.lineTo(d + h, h);
    ctx.moveTo(d, h);
    ctx.lineTo(d + h, 0);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.3;
  const half = WINTER_LATTICE_STEP / 2;
  for (let y = 0; y <= h; y += half) {
    const row = Math.round(y / half);
    for (let x = row % 2 === 0 ? 0 : half; x <= w; x += WINTER_LATTICE_STEP) {
      drawSnowflake(ctx, { x, y }, 9, palette.glow);
    }
  }
  ctx.globalAlpha = 1;

  // Frosted glow behind the medallion
  const center = getBackCenter(size);
  const frost = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, h * 0.45);
  frost.addColorStop(0, 'rgba(220,240,255,0.25)');
  frost.addColorStop(1, 'rgba(220,240,255,0)');
  ctx.fillStyle = frost;
  ctx.fillRect(0, 0, w, h);

  // Star medallion
  const inner = drawMedallion(ctx, center, getMedallionRadius(size), {
    fillInner: palette.base, fillOuter: palette.deep, metal: palette.metal, shade: palette.metalShade,
  });
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.5;
  drawStar(ctx, center.x, center.y, inner * 0.98, 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.metal;
  drawStar(ctx, center.x, center.y, inner * 0.82, 8);
  ctx.fillStyle = palette.deep;
  drawStar(ctx, center.x, center.y, inner * 0.5, 8);
  drawSnowflake(ctx, center, inner * 0.36, palette.glow);

  drawVignette(ctx, size, 0.3);
  drawSeasonalFrame(ctx, size, palette);

  // Icicles hanging from the top frame
  ctx.fillStyle = palette.metal;
  ctx.globalAlpha = 0.8;
  const span = (w - 80) / WINTER_ICICLE_COUNT;
  for (let i = 0; i < WINTER_ICICLE_COUNT; i++) {
    const x = 40 + span * i + span / 2;
    const len = 14 + ((i * 7) % 5) * 6;
    ctx.beginPath();
    ctx.moveTo(x - span * 0.28, 33);
    ctx.lineTo(x, 33 + len);
    ctx.lineTo(x + span * 0.28, 33);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  forEachCorner(size, (corner) => drawSnowflake(ctx, corner, 18, palette.metal), 52);
};

export const paintSpringBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  const random = createSeededRandom('card-back:spring');
  fillLinearBackground(ctx, size, [palette.base, palette.deep, palette.metalShade]);

  // Climbing vines from the bottom corners
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  for (const dir of [1, -1]) {
    const x0 = dir === 1 ? 40 : w - 40;
    ctx.beginPath();
    ctx.moveTo(x0, h - 40);
    ctx.bezierCurveTo(x0 + dir * 120, h * 0.75, x0 - dir * 10, h * 0.55, x0 + dir * 70, h * 0.38);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const t = 0.15 + i * 0.13;
      const lx = x0 + dir * (40 + Math.sin(t * Math.PI * 2) * 30);
      const ly = h - 40 - t * (h * 0.58);
      drawLeaf(ctx, { x: lx, y: ly }, 14, dir * (0.9 + (i % 2) * 0.9), { color: palette.accent, vein: palette.metalShade });
    }
  }

  // Drifting petals and little blossoms
  ctx.fillStyle = palette.glow;
  for (let i = 0; i < SPRING_PETAL_COUNT; i++) {
    ctx.globalAlpha = 0.35 + random() * 0.45;
    drawPetal(ctx, { x: random() * w, y: random() * h }, 5 + random() * 6, random() * TAU);
  }
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < SPRING_BLOSSOM_COUNT; i++) {
    drawFlower(ctx, { x: 50 + random() * (w - 100), y: 50 + random() * (h - 100) }, 10 + random() * 8, 5, {
      petal: palette.metal, center: palette.base,
    });
  }
  ctx.globalAlpha = 1;

  // Flower medallion wreathed in leaves
  const center = getBackCenter(size);
  const inner = drawMedallion(ctx, center, getMedallionRadius(size), {
    fillInner: palette.glow, fillOuter: palette.base, metal: palette.metal, shade: palette.metalShade,
  });
  const wreath = 10;
  for (let i = 0; i < wreath; i++) {
    const a = (i * TAU) / wreath;
    drawLeaf(ctx, { x: center.x + Math.cos(a) * inner * 0.8, y: center.y + Math.sin(a) * inner * 0.8 }, 16, a, { color: palette.accent });
  }
  drawFlower(ctx, center, inner * 0.62, 8, { petal: palette.base, center: palette.metal });
  drawFlower(ctx, center, inner * 0.36, 6, { petal: palette.glow, center: palette.metalShade });

  drawVignette(ctx, size, 0.22);
  drawSeasonalFrame(ctx, size, palette);
  forEachCorner(size, (corner) => drawFlower(ctx, corner, 16, 5, { petal: palette.metal, center: palette.accent }), 48);
};

export const paintSummerBack: CardBackPainter = (ctx, size, palette) => {
  const { w, h } = size;
  const random = createSeededRandom('card-back:summer');
  const sandY = h * SUMMER_SAND_START;
  fillLinearBackground(ctx, size, [palette.base, palette.deep]);

  // Wave pattern across the water
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 2;
  let row = 0;
  for (let y = 40; y < sandY - 10; y += SUMMER_WAVE_ROW_GAP) {
    ctx.globalAlpha = 0.14 + (row % 3) * 0.06;
    const offset = (row % 2) * 24;
    drawWaveRow(ctx, { y, x0: -offset, x1: w }, 48, 7);
    row++;
  }
  ctx.globalAlpha = 1;

  // Sandy beach with a foamy shoreline, shells and starfish
  const sand = ctx.createLinearGradient(0, sandY, 0, h);
  sand.addColorStop(0, palette.metal);
  sand.addColorStop(1, palette.metalShade);
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, sandY);
  for (let x = 0; x <= w; x += 32) ctx.quadraticCurveTo(x + 16, sandY - 10, x + 32, sandY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  drawWaveRow(ctx, { y: sandY - 2, x0: 0, x1: w }, 32, 5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = SUMMER_STARFISH_COLOR;
  for (const [fx, fy, r] of [[0.22, 0.88, 16], [0.76, 0.9, 12]]) drawStar(ctx, w * fx, h * fy, r, 5);
  ctx.fillStyle = palette.glow;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(random() * w, sandY + 14 + random() * (h - sandY - 30), 1.5, 0, TAU);
    ctx.fill();
  }

  // Sun medallion
  const center = getBackCenter(size);
  center.y -= h * 0.04;
  const sunGlow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, h * 0.4);
  sunGlow.addColorStop(0, 'rgba(255,230,140,0.45)');
  sunGlow.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h);
  const inner = drawMedallion(ctx, center, getMedallionRadius(size), {
    fillInner: palette.glow, fillOuter: palette.base, metal: palette.metal, shade: palette.metalShade,
  });
  drawSun(ctx, center, inner * 0.48, 16, palette.accent);
  ctx.fillStyle = palette.metal;
  ctx.beginPath();
  ctx.arc(center.x, center.y, inner * 0.3, 0, TAU);
  ctx.fill();

  drawSeasonalFrame(ctx, size, palette);
  forEachCorner(size, (corner) => drawSun(ctx, corner, 8, 10, palette.metal), 50);
};
