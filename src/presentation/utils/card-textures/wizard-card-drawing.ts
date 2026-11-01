'use client';

import { createSeededRandom, drawOrnateFrame, drawStar, drawPentagram } from './drawing-utils';

/** Seed of the background stars, so every repaint of the Wizard face looks the same */
const STAR_SEED = 'wizard-card:stars';

/**
 * Draws a Wizard card - the highest trump card in the game.
 * Features mystical purple background with gold decorations,
 * magical circle with pentagram, and prominent "W" corners.
 */
export function drawWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  // Background gradient - deep purple to black
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 1.5);
  bgGrad.addColorStop(0, '#2d1b4e');
  bgGrad.addColorStop(0.5, '#1a0f2e');
  bgGrad.addColorStop(1, '#0a0515');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Ornate gold border
  drawOrnateFrame(ctx, w, h, '#ffd700', '#b8860b');

  // Mystical stars background
  const random = createSeededRandom(STAR_SEED);
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  for (let i = 0; i < 30; i++) {
    const x = random() * (w - 80) + 40;
    const y = random() * (h - 80) + 40;
    const size = random() * 3 + 1;
    drawStar(ctx, x, y, size, 4);
  }

  // Central magical circle
  const cx = w / 2;
  const cy = h / 2 - 20;

  // Outer glow
  const glowGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 140);
  glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
  glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.fill();

  // Magic circle rings
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 100, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 85, 0, Math.PI * 2);
  ctx.stroke();

  // Pentagram
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  drawPentagram(ctx, cx, cy, 70);

  // Central wizard star
  ctx.fillStyle = '#ffd700';
  drawStar(ctx, cx, cy, 35, 5);

  // Inner star highlight
  ctx.fillStyle = '#fff8dc';
  drawStar(ctx, cx, cy, 20, 5);

  // "WIZARD" text
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 15;
  ctx.fillText('WIZARD', w / 2, h - 100);
  ctx.shadowBlur = 0;

  // Corner decorations
  const cornerX = 85;
  const cornerY = 90;
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 80px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('W', cornerX, cornerY);

  ctx.save();
  ctx.translate(w - cornerX, h - cornerY);
  ctx.rotate(Math.PI);
  ctx.fillText('W', 0, 0);
  ctx.restore();

  // Small stars in corners
  ctx.fillStyle = '#ffd700';
  drawStar(ctx, cornerX, cornerY + 55, 15, 5);
  drawStar(ctx, w - cornerX, h - cornerY - 55, 15, 5);
}
