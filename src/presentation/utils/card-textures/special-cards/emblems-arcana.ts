'use client';

/**
 * Emblem painters: arcana (Bomb, Juggler, Cloud, Shapeshifter, Witch). See special-card-emblems.ts for the unit space.
 */

import { mixColor, starPath, withAlpha } from '../styles/style-shared';
import { EMBLEM_UNIT, TAU, circlePath, dropPath, ellipsePath, fillInked, fillSilhouette, polygonPath, strokeCased, strokeLine, twinkles, type EmblemPainter } from './emblem-brush';


/** Round black bomb with a steel cap and a lit, sparking fuse */
export const paintBomb: EmblemPainter = (b) => {
  const { ctx, c } = b;
  ctx.beginPath();
  ctx.moveTo(41, -46);
  ctx.quadraticCurveTo(52, -82, 78, -74);
  strokeCased(b, mixColor(c.secondary, 'white', 0.45), 6);

  circlePath(ctx, -8, 18, 64);
  fillInked(b, c.primary);
  ctx.beginPath();
  ctx.arc(-8, 18, 50, Math.PI * 1.05, Math.PI * 1.45);
  strokeLine(b, mixColor(c.primary, 'white', 0.4), 9);
  circlePath(ctx, -44, -16, 5);
  ctx.fillStyle = mixColor(c.primary, 'white', 0.65);
  ctx.fill();

  ctx.save();
  ctx.translate(34, -36);
  ctx.rotate(0.65);
  ctx.beginPath();
  ctx.rect(-17, -12, 34, 24);
  fillInked(b, c.secondary);
  ctx.beginPath();
  ctx.moveTo(-17, -3);
  ctx.lineTo(17, -3);
  strokeLine(b, mixColor(c.secondary, 'white', 0.3), 3);
  ctx.restore();

  starPath(ctx, { x: 80, y: -76, outer: 24, inner: 9, points: 8 });
  fillInked(b, c.glow);
  starPath(ctx, { x: 80, y: -76, outer: 12, inner: 5, points: 8 });
  ctx.fillStyle = c.accent;
  ctx.fill();
  twinkles(b, c.accent, [[58, -94, 5], [98, -54, 5], [64, -56, 3]]);
};


/** Four balls on a dotted juggling arc above two crossed clubs */
export const paintJuggler: EmblemPainter = (b) => {
  const { ctx, c } = b;
  ctx.setLineDash([6, 8]);
  ellipsePath(ctx, { x: 0, y: -8 }, 76, 58);
  strokeLine(b, withAlpha(c.ink, 0.5), 3);
  ctx.setLineDash([]);

  const club = (angle: number, color: string) => {
    ctx.save();
    ctx.translate(0, 50);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-4, 38);
    ctx.lineTo(-5, 10);
    ctx.quadraticCurveTo(-16, -4, -10, -22);
    ctx.quadraticCurveTo(-6, -34, 0, -36);
    ctx.quadraticCurveTo(6, -34, 10, -22);
    ctx.quadraticCurveTo(16, -4, 5, 10);
    ctx.lineTo(4, 38);
    ctx.closePath();
    fillInked(b, color);
    ctx.beginPath();
    ctx.moveTo(-11, -14);
    ctx.lineTo(11, -14);
    strokeLine(b, c.accent, 5);
    circlePath(ctx, 0, 40, 6);
    fillInked(b, c.accent);
    ctx.restore();
  };
  club(-0.5, c.secondary);
  club(0.5, c.primary);

  const balls = [c.primary, c.secondary, c.accent, c.glow];
  balls.forEach((color, i) => {
    const angle = -2.7 + i * 0.78;
    const x = Math.cos(angle) * 76;
    const y = -8 + Math.sin(angle) * 58;
    circlePath(ctx, x, y, 16);
    fillInked(b, color);
    circlePath(ctx, x - 5, y - 5, 4.5);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  });
};


/** Puffy cloud with a lightning bolt and two raindrops */
export const paintCloud: EmblemPainter = (b) => {
  const { ctx, c } = b;
  const puffs: ReadonlyArray<readonly [number, number, number]> = [
    [-42, 8, 30], [-6, -16, 40], [34, -2, 32], [60, 26, 20], [-66, 26, 20],
  ];
  const cloudPath = () => {
    ctx.beginPath();
    for (const [x, y, r] of puffs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.rect(-66, 6, 126, 40);
  };

  polygonPath(ctx, [[8, 40], [-12, 74], [2, 74], [-8, 98], [24, 62], [10, 62], [20, 40]]);
  fillInked(b, c.accent);
  for (const [x, y] of [[-42, 66], [44, 68]]) {
    dropPath(ctx, x, y, 7);
    fillInked(b, c.glow);
  }

  cloudPath();
  fillSilhouette(b, c.primary);
  ctx.save();
  cloudPath();
  ctx.clip();
  ellipsePath(ctx, { x: 0, y: 54 }, 96, 26);
  ctx.fillStyle = c.secondary;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(-6, -16, 28, Math.PI * 1.1, Math.PI * 1.55);
  ctx.moveTo(-60, -2);
  ctx.arc(-42, 8, 20, Math.PI * 1.15, Math.PI * 1.5);
  strokeLine(b, withAlpha(c.glow, 0.7), 4);
};


/** Mask split down the middle: Wizard hat and star eye / Jester cap and grin */
export const paintShapeshifter: EmblemPainter = (b) => {
  const { ctx, c } = b;
  const half = (side: -1 | 1, draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side < 0 ? -EMBLEM_UNIT : 0, -EMBLEM_UNIT, EMBLEM_UNIT, EMBLEM_UNIT * 2);
    ctx.clip();
    draw();
    ctx.restore();
  };

  polygonPath(ctx, [[-62, -30], [-16, -98], [-2, -34]]);
  fillInked(b, c.primary);
  starPath(ctx, { x: -26, y: -56, outer: 9, inner: 4, points: 5 });
  ctx.fillStyle = c.accent;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2, -34);
  ctx.quadraticCurveTo(30, -96, 78, -74);
  ctx.quadraticCurveTo(56, -60, 60, -28);
  ctx.closePath();
  fillInked(b, c.secondary);
  circlePath(ctx, 80, -74, 9);
  fillInked(b, c.accent);

  half(-1, () => {
    ctx.beginPath();
    ctx.rect(-64, -42, 64, 16);
    ctx.fillStyle = mixColor(c.primary, 'black', 0.3);
    ctx.fill();
    ellipsePath(ctx, { x: 0, y: 18 }, 56, 66);
    ctx.fillStyle = mixColor(c.primary, 'white', 0.6);
    ctx.fill();
  });
  half(1, () => {
    ctx.beginPath();
    ctx.rect(0, -42, 64, 16);
    ctx.fillStyle = mixColor(c.secondary, 'black', 0.3);
    ctx.fill();
    ellipsePath(ctx, { x: 0, y: 18 }, 56, 66);
    ctx.fillStyle = mixColor(c.secondary, 'white', 0.6);
    ctx.fill();
  });
  ellipsePath(ctx, { x: 0, y: 18 }, 56, 66);
  if (b.outline > 0) strokeLine(b, c.ink, b.outline);

  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(10, -14, -10, 30, 0, 84);
  strokeLine(b, c.ink, 3);

  starPath(ctx, { x: -24, y: 6, outer: 12, inner: 5, points: 5 });
  fillInked(b, c.accent);
  ctx.beginPath();
  ctx.arc(24, 10, 10, Math.PI * 1.1, Math.PI * 1.9);
  ctx.moveTo(-30, 50);
  ctx.lineTo(-4, 50);
  ctx.moveTo(4, 50);
  ctx.quadraticCurveTo(20, 66, 32, 42);
  strokeLine(b, c.ink, 4);
};


/** Crooked witch hat floating over a bubbling cauldron */
export const paintWitch: EmblemPainter = (b) => {
  const { ctx, c } = b;
  ellipsePath(ctx, { x: 0, y: 62 }, 48, 32);
  fillInked(b, c.secondary);
  ctx.beginPath();
  ctx.moveTo(-30, 90);
  ctx.lineTo(-38, 98);
  ctx.moveTo(30, 90);
  ctx.lineTo(38, 98);
  strokeCased(b, c.secondary, 6);
  ellipsePath(ctx, { x: 0, y: 34 }, 54, 11);
  fillInked(b, mixColor(c.secondary, 'white', 0.25));
  ellipsePath(ctx, { x: 0, y: 34 }, 45, 7);
  ctx.fillStyle = c.accent;
  ctx.fill();
  for (const [x, y, r] of [[-18, 18, 6], [6, 10, 8], [26, 22, 4], [-4, -2, 3]]) {
    circlePath(ctx, x, y, r);
    fillInked(b, c.glow);
  }

  ellipsePath(ctx, { x: 0, y: -24 }, 64, 12);
  fillInked(b, c.primary);
  ctx.beginPath();
  ctx.moveTo(-34, -28);
  ctx.lineTo(-10, -70);
  ctx.quadraticCurveTo(0, -92, 34, -90);
  ctx.quadraticCurveTo(10, -78, 8, -62);
  ctx.lineTo(34, -28);
  ctx.closePath();
  fillInked(b, c.primary);
  polygonPath(ctx, [[-30, -40], [29, -40], [33, -30], [-34, -30]]);
  ctx.fillStyle = c.glow;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-8, -43, 16, 16);
  strokeLine(b, c.accent, 3);

  for (const [x, y, r] of [[-62, -56, 9], [60, -30, 7], [-58, 6, 5]]) {
    starPath(ctx, { x, y, outer: r, inner: r * 0.42, points: 5 });
    ctx.fillStyle = c.accent;
    ctx.fill();
  }
};
