'use client';

import { drawOrnateFrame } from './drawing-utils';

/** Draws the colorful diamond pattern background */
function drawDiamondPattern(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const colors = ['#c41e3a', '#228b22', '#4169e1', '#ffd700'];
  const diamondSize = 40;
  for (let row = 0; row < h / diamondSize + 1; row++) {
    for (let col = 0; col < w / diamondSize + 1; col++) {
      const x = col * diamondSize;
      const y = row * diamondSize;
      ctx.fillStyle = colors[(row + col) % 4];
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(x + diamondSize / 2, y);
      ctx.lineTo(x + diamondSize, y + diamondSize / 2);
      ctx.lineTo(x + diamondSize / 2, y + diamondSize);
      ctx.lineTo(x, y + diamondSize / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Draws the three-pointed jester hat with bells (shared with styled decks) */
export function drawJesterHat(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = '#c41e3a';
  ctx.beginPath();
  ctx.moveTo(cx - 80, cy - 30);
  ctx.quadraticCurveTo(cx - 100, cy - 120, cx - 60, cy - 100);
  ctx.lineTo(cx, cy - 50);
  ctx.fill();

  ctx.fillStyle = '#228b22';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 50);
  ctx.quadraticCurveTo(cx + 20, cy - 130, cx + 70, cy - 90);
  ctx.lineTo(cx + 80, cy - 30);
  ctx.lineTo(cx, cy - 50);
  ctx.fill();

  ctx.fillStyle = '#4169e1';
  ctx.beginPath();
  ctx.moveTo(cx - 60, cy - 100);
  ctx.quadraticCurveTo(cx, cy - 150, cx + 70, cy - 90);
  ctx.lineTo(cx, cy - 50);
  ctx.fill();

  // Bells
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(cx - 60, cy - 105, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 70, cy - 95, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 5, cy - 135, 12, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws a Jester card - always loses in trick-taking.
 * Features colorful checkered background with a playful jester face,
 * three-pointed hat with bells, and diamond decorations.
 */
export function drawJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  // Checkered/diamond background
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(0, 0, w, h);
  drawDiamondPattern(ctx, w, h);

  // Ornate colorful border
  drawOrnateFrame(ctx, w, h, '#c41e3a', '#228b22');

  // Center jester face area
  const cx = w / 2;
  const cy = h / 2 - 30;
  drawJesterHat(ctx, cx, cy);

  // Face circle
  ctx.fillStyle = '#fff8dc';
  ctx.beginPath();
  ctx.arc(cx, cy + 20, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 20, cy + 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 20, cy + 10, 8, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#c41e3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy + 25, 30, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Red nose
  ctx.fillStyle = '#c41e3a';
  ctx.beginPath();
  ctx.arc(cx, cy + 25, 10, 0, Math.PI * 2);
  ctx.fill();

  // "JESTER" text
  ctx.fillStyle = '#c41e3a';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('JESTER', w / 2, h - 100);

  // Corner J's with diamonds
  const cornerX = 85;
  const cornerY = 90;
  ctx.fillStyle = '#228b22';
  ctx.font = 'bold 80px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('J', cornerX, cornerY);

  // Diamond symbol
  ctx.fillStyle = '#c41e3a';
  ctx.beginPath();
  ctx.moveTo(cornerX, cornerY + 45);
  ctx.lineTo(cornerX + 25, cornerY + 70);
  ctx.lineTo(cornerX, cornerY + 95);
  ctx.lineTo(cornerX - 25, cornerY + 70);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.translate(w - cornerX, h - cornerY);
  ctx.rotate(Math.PI);
  ctx.fillStyle = '#228b22';
  ctx.fillText('J', 0, 0);
  ctx.restore();
}
