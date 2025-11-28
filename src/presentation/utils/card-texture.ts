'use client';

import * as THREE from 'three';
import { ICard, CardType, Suit, SUIT_SYMBOLS } from '@shared/domain';

// Card dimensions
export const CARD_WIDTH = 0.7;
export const CARD_HEIGHT = 1.0;
export const CARD_THICKNESS = 0.02;

// Theme colors for each suit
export const SUIT_THEMES = {
  [Suit.GIANTS]: {
    primary: '#1a472a',
    secondary: '#2d5a3d',
    accent: '#8fbc8f',
    gold: '#b8860b',
    symbol: '⛰',
    name: 'GIANTS',
    pattern: 'mountains' as const,
  },
  [Suit.ELVES]: {
    primary: '#1a3a5c',
    secondary: '#2a5a8c',
    accent: '#87ceeb',
    gold: '#c0c0c0',
    symbol: '🌙',
    name: 'ELVES',
    pattern: 'stars' as const,
  },
  [Suit.DWARVES]: {
    primary: '#8b2500',
    secondary: '#b33a00',
    accent: '#ff6b35',
    gold: '#ffd700',
    symbol: '⚒',
    name: 'DWARVES',
    pattern: 'forge' as const,
  },
  [Suit.HUMANS]: {
    primary: '#4a3728',
    secondary: '#6b4423',
    accent: '#daa520',
    gold: '#ffd700',
    symbol: '👑',
    name: 'HUMANS',
    pattern: 'castle' as const,
  },
};

const CARD_BACK_PRIMARY = '#0a1628';
const CARD_BACK_SECONDARY = '#1a2a48';
const CARD_BACK_GOLD = '#c9a227';

// ============== MAIN TEXTURE CREATION ==============

export function createCardTexture(card: ICard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  if (card.type === CardType.WIZARD) {
    drawWizardCard(ctx, canvas.width, canvas.height);
  } else if (card.type === CardType.JESTER) {
    drawJesterCard(ctx, canvas.width, canvas.height);
  } else {
    drawNumberCard(ctx, canvas.width, canvas.height, card.suit!, card.value!);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Deep blue gradient background
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 1.2);
  bgGrad.addColorStop(0, CARD_BACK_SECONDARY);
  bgGrad.addColorStop(1, CARD_BACK_PRIMARY);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Ornate frame
  drawOrnateFrame(ctx, w, h, CARD_BACK_GOLD, '#8b7355');

  // Central mystical design
  const cx = w / 2;
  const cy = h / 2;

  // Outer circle
  ctx.strokeStyle = CARD_BACK_GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Inner decorative circles
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.stroke();

  // Central star pattern
  ctx.fillStyle = CARD_BACK_GOLD;
  drawStar(ctx, cx, cy, 80, 8);

  // Inner star
  ctx.fillStyle = CARD_BACK_SECONDARY;
  drawStar(ctx, cx, cy, 50, 8);

  // Center diamond
  ctx.fillStyle = CARD_BACK_GOLD;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx + 25, cy);
  ctx.lineTo(cx, cy + 30);
  ctx.lineTo(cx - 25, cy);
  ctx.closePath();
  ctx.fill();

  // Corner decorations
  ctx.fillStyle = CARD_BACK_GOLD;
  drawStar(ctx, 50, 50, 15, 4);
  drawStar(ctx, w - 50, 50, 15, 4);
  drawStar(ctx, 50, h - 50, 15, 4);
  drawStar(ctx, w - 50, h - 50, 15, 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCardMaterials(card: ICard): THREE.MeshBasicMaterial[] {
  const frontTex = createCardTexture(card);
  const backTex = createBackTexture();

  return [
    new THREE.MeshBasicMaterial({ color: '#2a2a3a' }),
    new THREE.MeshBasicMaterial({ color: '#2a2a3a' }),
    new THREE.MeshBasicMaterial({ color: '#2a2a3a' }),
    new THREE.MeshBasicMaterial({ color: '#2a2a3a' }),
    new THREE.MeshBasicMaterial({ map: frontTex }),
    new THREE.MeshBasicMaterial({ map: backTex }),
  ];
}

export function disposeCardMaterials(materials: THREE.MeshBasicMaterial[]): void {
  materials.forEach((m) => {
    if (m.map) m.map.dispose();
    m.dispose();
  });
}

// ============== WIZARD CARD ==============

function drawWizardCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * (w - 80) + 40;
    const y = Math.random() * (h - 80) + 40;
    const size = Math.random() * 3 + 1;
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
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('W', 45, 55);

  ctx.save();
  ctx.translate(w - 45, h - 55);
  ctx.rotate(Math.PI);
  ctx.fillText('W', 0, 0);
  ctx.restore();

  // Small stars in corners
  ctx.fillStyle = '#ffd700';
  drawStar(ctx, 45, 95, 10, 5);
  drawStar(ctx, w - 45, h - 95, 10, 5);
}

// ============== JESTER CARD ==============

function drawJesterCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Checkered/diamond background
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(0, 0, w, h);

  // Diamond pattern
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

  // Ornate colorful border
  drawOrnateFrame(ctx, w, h, '#c41e3a', '#228b22');

  // Center jester face area
  const cx = w / 2;
  const cy = h / 2 - 30;

  // Jester hat
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

  // Bells on hat
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
  ctx.fillStyle = '#228b22';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('J', 45, 55);

  // Diamond symbol
  ctx.fillStyle = '#c41e3a';
  ctx.beginPath();
  ctx.moveTo(45, 85);
  ctx.lineTo(60, 100);
  ctx.lineTo(45, 115);
  ctx.lineTo(30, 100);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.translate(w - 45, h - 55);
  ctx.rotate(Math.PI);
  ctx.fillStyle = '#228b22';
  ctx.fillText('J', 0, 0);
  ctx.restore();
}

// ============== NUMBER CARD ==============

function drawNumberCard(ctx: CanvasRenderingContext2D, w: number, h: number, suit: Suit, value: number) {
  const theme = SUIT_THEMES[suit];

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, theme.primary);
  bgGrad.addColorStop(0.5, theme.secondary);
  bgGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Pattern based on suit
  ctx.globalAlpha = 0.15;
  if (theme.pattern === 'mountains') {
    drawMountainPattern(ctx, w, h, theme.accent);
  } else if (theme.pattern === 'stars') {
    drawStarPattern(ctx, w, h, theme.accent);
  } else if (theme.pattern === 'forge') {
    drawForgePattern(ctx, w, h, theme.accent);
  } else if (theme.pattern === 'castle') {
    drawCastlePattern(ctx, w, h, theme.accent);
  }
  ctx.globalAlpha = 1;

  // Ornate frame
  drawOrnateFrame(ctx, w, h, theme.gold, theme.accent);

  // Center emblem area
  const cx = w / 2;
  const cy = h / 2 - 20;

  // Emblem background circle
  const emblemGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
  emblemGrad.addColorStop(0, theme.secondary);
  emblemGrad.addColorStop(1, theme.primary);
  ctx.fillStyle = emblemGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.fill();

  // Emblem border
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Large value number in center
  ctx.fillStyle = theme.gold;
  ctx.font = 'bold 100px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(String(value), cx, cy);
  ctx.shadowBlur = 0;

  // Suit name below
  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillText(theme.name, cx, h - 100);

  // Suit symbols decoration
  ctx.font = '28px Arial';
  ctx.fillText(theme.symbol, cx - 50, h - 140);
  ctx.fillText(theme.symbol, cx + 50, h - 140);

  // Corner values with suit symbol
  ctx.fillStyle = theme.gold;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(value), 45, 50);
  ctx.font = '24px Arial';
  ctx.fillText(SUIT_SYMBOLS[suit], 45, 85);

  ctx.save();
  ctx.translate(w - 45, h - 50);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText(String(value), 0, 0);
  ctx.font = '24px Arial';
  ctx.fillText(SUIT_SYMBOLS[suit], 0, 35);
  ctx.restore();
}

// ============== HELPER FUNCTIONS ==============

function drawOrnateFrame(ctx: CanvasRenderingContext2D, w: number, h: number, primary: string, secondary: string) {
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

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, points: number) {
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

function drawPentagram(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
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

function drawMountainPattern(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const x = (i * w) / 4;
    const peakHeight = 100 + Math.random() * 100;
    ctx.beginPath();
    ctx.moveTo(x - 80, h);
    ctx.lineTo(x + 40, h - peakHeight);
    ctx.lineTo(x + 160, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStarPattern(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = 5 + Math.random() * 10;
    drawStar(ctx, x, y, size, 4);
  }
}

function drawForgePattern(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
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
    const x = Math.random() * w;
    const y = Math.random() * h * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCastlePattern(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
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
