'use client';

/**
 * Emblem painters: creatures (Dragon, Fairy, Werewolf, Vampire). See special-card-emblems.ts for the unit space.
 */

import { mixColor, starPath, withAlpha } from '../styles/style-shared';
import { circlePath, dropPath, ellipsePath, fillInked, mirrored, polygonPath, strokeCased, strokeLine, twinkles, type EmblemPainter } from './emblem-brush';


/** Heraldic dragon, wings spread, horned head facing out, tail curling below */
export const paintDragon: EmblemPainter = (b) => {
  const { ctx, c } = b;
  mirrored(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.lineTo(-58, -64);
    ctx.lineTo(-98, -76);
    ctx.quadraticCurveTo(-86, -46, -96, -12);
    ctx.quadraticCurveTo(-76, -22, -70, 8);
    ctx.quadraticCurveTo(-54, -6, -42, 22);
    ctx.quadraticCurveTo(-30, 8, -16, 18);
    ctx.closePath();
    fillInked(b, c.secondary);
    ctx.beginPath();
    for (const [x, y] of [[-96, -12], [-70, 8], [-42, 22]]) {
      ctx.moveTo(-58, -64);
      ctx.lineTo(x, y);
    }
    strokeLine(b, c.primary, 4);
  });

  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.bezierCurveTo(34, 64, -34, 74, 6, 90);
  strokeCased(b, c.primary, 11);
  polygonPath(ctx, [[6, 82], [22, 92], [4, 100], [-6, 90]]);
  fillInked(b, c.accent);

  ellipsePath(ctx, { x: 0, y: 16 }, 22, 34);
  fillInked(b, c.primary);
  ctx.beginPath();
  for (const y of [2, 14, 26, 38]) {
    ctx.moveTo(-12, y);
    ctx.lineTo(0, y + 6);
    ctx.lineTo(12, y);
  }
  strokeLine(b, c.accent, 3);

  mirrored(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-16, -64);
    ctx.quadraticCurveTo(-34, -82, -24, -99);
    ctx.quadraticCurveTo(-20, -80, -4, -72);
    ctx.closePath();
    fillInked(b, c.accent);
  });

  ctx.beginPath();
  ctx.moveTo(0, -76);
  ctx.quadraticCurveTo(28, -74, 28, -52);
  ctx.quadraticCurveTo(26, -34, 14, -22);
  ctx.quadraticCurveTo(12, -6, 0, -4);
  ctx.quadraticCurveTo(-12, -6, -14, -22);
  ctx.quadraticCurveTo(-26, -34, -28, -52);
  ctx.quadraticCurveTo(-28, -74, 0, -76);
  ctx.closePath();
  fillInked(b, c.primary);

  mirrored(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-22, -50);
    ctx.quadraticCurveTo(-14, -60, -6, -48);
    ctx.quadraticCurveTo(-14, -43, -22, -50);
    ctx.closePath();
    fillInked(b, c.accent);
    ctx.beginPath();
    ctx.moveTo(-13, -55);
    ctx.lineTo(-13, -46);
    strokeLine(b, c.ink, 2.5);
    circlePath(ctx, -5, -14, 2.5);
    ctx.fillStyle = c.ink;
    ctx.fill();
  });
};


/** Winged fairy with a star wand and a trail of sparkles */
export const paintFairy: EmblemPainter = (b) => {
  const { ctx, c } = b;
  mirrored(ctx, () => {
    ellipsePath(ctx, { x: -42, y: -34 }, 44, 24, -0.55);
    fillInked(b, withAlpha(c.primary, 0.85));
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-42, -34, -76, -56);
    strokeLine(b, c.glow, 2.5);

    ellipsePath(ctx, { x: -34, y: 16 }, 30, 17, 0.5);
    fillInked(b, withAlpha(c.secondary, 0.9));
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.quadraticCurveTo(-32, 14, -58, 30);
    strokeLine(b, c.glow, 2.5);
  });

  ctx.beginPath();
  ctx.moveTo(-6, 22);
  ctx.lineTo(-10, 46);
  ctx.moveTo(6, 22);
  ctx.lineTo(11, 44);
  strokeCased(b, c.glow, 4);

  ctx.beginPath();
  ctx.moveTo(-7, -36);
  ctx.lineTo(7, -36);
  ctx.lineTo(22, 22);
  ctx.quadraticCurveTo(0, 30, -22, 22);
  ctx.closePath();
  fillInked(b, c.secondary);

  ctx.beginPath();
  ctx.moveTo(5, -28);
  ctx.lineTo(30, -46);
  strokeCased(b, c.glow, 4);
  ctx.beginPath();
  ctx.moveTo(30, -46);
  ctx.lineTo(50, -70);
  strokeLine(b, c.ink, 3);

  circlePath(ctx, 0, -50, 13);
  fillInked(b, c.glow);
  ctx.beginPath();
  ctx.arc(0, -52, 14, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  fillInked(b, c.accent);
  circlePath(ctx, 0, -68, 6);
  fillInked(b, c.accent);

  starPath(ctx, { x: 52, y: -73, outer: 13, inner: 5.5, points: 5 });
  fillInked(b, c.accent);
  twinkles(b, c.accent, [[70, -48, 7], [60, -24, 5], [76, -4, 4], [40, -92, 5]]);
};


/** Wolf howling in profile against a full moon */
export const paintWerewolf: EmblemPainter = (b) => {
  const { ctx, c } = b;
  circlePath(ctx, 10, -30, 62);
  fillInked(b, c.glow);
  ctx.fillStyle = mixColor(c.glow, 'black', 0.12);
  for (const [x, y, r] of [[30, -52, 10], [-6, -12, 7], [44, -14, 6], [8, -64, 5]]) {
    circlePath(ctx, x, y, r);
    ctx.fill();
  }

  polygonPath(ctx, [
    [-40, 96], [-30, 52], [-38, 40], [-24, 30], [-32, 16], [-18, -14],
    // Open howling jaws
    [-44, -40], [-24, -42], [-50, -56], [-56, -64], [-52, -72],
    [-14, -40], [-2, -42], [6, -76], [20, -40], [32, -26],
    // Ruffled nape
    [34, -6], [46, 2], [38, 18], [52, 32], [42, 52], [46, 96],
  ]);
  fillInked(b, c.primary);

  polygonPath(ctx, [[5, -64], [8, -44], [15, -42]]);
  ctx.fillStyle = c.secondary;
  ctx.fill();
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of [[12, 0, 20, 22], [0, 12, 6, 36], [22, 32, 26, 54], [-10, 40, -6, 64]]) {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  strokeLine(b, c.secondary, 3);

  ctx.beginPath();
  ctx.moveTo(-16, -32);
  ctx.quadraticCurveTo(-8, -40, 0, -32);
  ctx.quadraticCurveTo(-8, -28, -16, -32);
  ctx.closePath();
  fillInked(b, c.accent);
};


/** Pale vampire with a widow's peak and fangs, framed by a high cape collar */
export const paintVampire: EmblemPainter = (b) => {
  const { ctx, c } = b;
  mirrored(ctx, () => {
    polygonPath(ctx, [[-14, 60], [-88, -62], [-62, -10], [-84, 40], [-40, 74]]);
    fillInked(b, c.secondary);
    polygonPath(ctx, [[-18, 52], [-72, -40], [-52, -4], [-66, 34], [-34, 62]]);
    ctx.fillStyle = c.primary;
    ctx.fill();
  });

  ctx.beginPath();
  ctx.rect(-10, 28, 20, 30);
  ctx.fillStyle = mixColor(c.glow, 'black', 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-48, 88);
  ctx.quadraticCurveTo(-44, 54, -14, 54);
  ctx.lineTo(0, 70);
  ctx.lineTo(14, 54);
  ctx.quadraticCurveTo(44, 54, 48, 88);
  ctx.closePath();
  fillInked(b, c.secondary);

  ellipsePath(ctx, { x: 0, y: -6 }, 34, 44);
  fillInked(b, c.glow);
  ctx.beginPath();
  ctx.moveTo(-36, -10);
  ctx.quadraticCurveTo(-40, -58, 0, -58);
  ctx.quadraticCurveTo(40, -58, 36, -10);
  ctx.lineTo(30, -30);
  ctx.quadraticCurveTo(14, -44, 0, -26);
  ctx.quadraticCurveTo(-14, -44, -30, -30);
  ctx.closePath();
  fillInked(b, c.secondary);

  mirrored(ctx, () => {
    polygonPath(ctx, [[-24, -12], [-7, -6], [-22, -3]]);
    ctx.fillStyle = c.primary;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, -20);
    ctx.lineTo(-6, -12);
    strokeLine(b, c.ink, 3.5);
    polygonPath(ctx, [[-10, 23], [-6, 35], [-3, 25]]);
    fillInked(b, c.accent);
  });
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.quadraticCurveTo(0, 28, 14, 22);
  strokeLine(b, c.ink, 3);
  dropPath(ctx, -6, 44, 3.5);
  ctx.fillStyle = c.primary;
  ctx.fill();
};
