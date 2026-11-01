'use client';

/**
 * Shared drawing utility functions for card textures.
 * Contains common shapes, patterns, and frame drawing functions.
 */

export type RandomSource = () => number;

export function createSeededRandom(seed: string): RandomSource {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============== SHAPE DRAWING ==============

/**
 * Draws a star shape at the specified position.
 */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  points: number
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.4;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws a pentagram (five-pointed star outline) at the specified position.
 */
export function drawPentagram(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

// ============== FRAME DRAWING ==============

/**
 * Draws an ornate decorative frame around the card.
 */
export function drawOrnateFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  primary: string,
  secondary: string
): void {
  // Outer border
  ctx.strokeStyle = primary;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Inner border
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Corner flourishes
  const cornerSize = 40;
  ctx.strokeStyle = primary;
  ctx.lineWidth = 3;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(24, 24 + cornerSize);
  ctx.lineTo(24, 24);
  ctx.lineTo(24 + cornerSize, 24);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - 24 - cornerSize, 24);
  ctx.lineTo(w - 24, 24);
  ctx.lineTo(w - 24, 24 + cornerSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(24, h - 24 - cornerSize);
  ctx.lineTo(24, h - 24);
  ctx.lineTo(24 + cornerSize, h - 24);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - 24 - cornerSize, h - 24);
  ctx.lineTo(w - 24, h - 24);
  ctx.lineTo(w - 24, h - 24 - cornerSize);
  ctx.stroke();
}

// ============== PATTERN DRAWING ==============

/**
 * Draws a mountain pattern (used for Giants suit).
 */
export function drawMountainPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  random: RandomSource = Math.random
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const x = (i * w) / 4;
    const peakHeight = 100 + random() * 100;
    ctx.beginPath();
    ctx.moveTo(x - 80, h);
    ctx.lineTo(x + 40, h - peakHeight);
    ctx.lineTo(x + 160, h);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Draws a star pattern (used for Elves suit).
 */
export function drawStarPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  random: RandomSource = Math.random
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 25; i++) {
    const x = random() * w;
    const y = random() * h;
    const size = 5 + random() * 10;
    drawStar(ctx, x, y, size, 4);
  }
}

/**
 * Draws a forge pattern (used for Dwarves suit).
 */
export function drawForgePattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  random: RandomSource = Math.random
): void {
  ctx.fillStyle = color;
  // Anvil shapes
  for (let i = 0; i < 3; i++) {
    const x = w * (0.25 + i * 0.25);
    const y = h * 0.7;
    ctx.fillRect(x - 30, y, 60, 20);
    ctx.fillRect(x - 20, y - 30, 40, 30);
  }
  // Spark effects
  for (let i = 0; i < 20; i++) {
    const x = random() * w;
    const y = random() * h * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws a castle pattern (used for Humans suit).
 */
export function drawCastlePattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  // Castle silhouette
  const baseY = h * 0.6;
  ctx.fillRect(w * 0.2, baseY, w * 0.6, h - baseY);

  // Towers
  ctx.fillRect(w * 0.15, baseY - 80, 40, 80);
  ctx.fillRect(w * 0.8 - 20, baseY - 80, 40, 80);

  // Battlements
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(w * 0.15 + 5 + i * 6, baseY - 95, 4, 15);
    ctx.fillRect(w * 0.8 - 15 + i * 6, baseY - 95, 4, 15);
  }

  // Central tower
  ctx.fillRect(w * 0.45, baseY - 120, w * 0.1, 120);
  ctx.beginPath();
  ctx.moveTo(w * 0.45, baseY - 120);
  ctx.lineTo(w * 0.5, baseY - 160);
  ctx.lineTo(w * 0.55, baseY - 120);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the background pattern for a suit pattern id.
 * Used by the stylized art styles; the classic number card inlines the same switch.
 */
export function drawSuitPattern(
  ctx: CanvasRenderingContext2D,
  { w, h }: { w: number; h: number },
  pattern: 'mountains' | 'stars' | 'forge' | 'castle',
  color: string,
  random: RandomSource
): void {
  if (pattern === 'mountains') drawMountainPattern(ctx, w, h, color, random);
  else if (pattern === 'stars') drawStarPattern(ctx, w, h, color, random);
  else if (pattern === 'forge') drawForgePattern(ctx, w, h, color, random);
  else drawCastlePattern(ctx, w, h, color);
}
