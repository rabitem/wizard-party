'use client';

/**
 * Classic face for the expansion special cards, in the idiom of the classic
 * Wizard card: radial card stock, ornate frame, star specks, a glowing magic
 * ring around the emblem, Georgia title and big mirrored corner index.
 */

import type { SpecialCardType } from '@shared/domain';
import { createSeededRandom, drawOrnateFrame, drawStar, type RandomSource } from '../drawing-utils';
import { blendHex, drawMirroredCorners, fitFontSize, withAlpha, type CardSize } from '../styles/style-shared';
import { drawSpecialCardEmblem } from './special-card-emblems';
import { getSpecialCardFace, layoutSpecialFace, type SpecialCardFace } from './special-card-face';

const SERIF = 'Georgia, serif';
const EMBLEM_RADIUS = 118;
const EMBLEM_OUTLINE = 3;
/** Magic ring and halo radius relative to the emblem */
const RING_SCALE = 1.14;
const HALO_SCALE = 1.35;
const SPECKS = 30;
const TITLE = { SIZE: 42, MAX_WIDTH: 400, OFFSET: 100, GLOW: 15 } as const;
const CORNER = { X: 85, Y: 90, SIZE: 80, MAX_WIDTH: 88, STAR: 15, STAR_DROP: 55 } as const;
const VALUE_GLOW = 18;

function drawClassicStock(ctx: CanvasRenderingContext2D, { w, h }: CardSize, face: SpecialCardFace, random: RandomSource): void {
  const { field, fieldEdge, metal } = face.palette;
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 1.5);
  bg.addColorStop(0, field);
  bg.addColorStop(0.5, blendHex(field, fieldEdge, 0.5));
  bg.addColorStop(1, fieldEdge);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawOrnateFrame(ctx, w, h, metal, blendHex(metal, '#000000', 0.35));

  ctx.fillStyle = withAlpha(metal, 0.3);
  for (let i = 0; i < SPECKS; i++) {
    const x = random() * (w - 80) + 40;
    const y = random() * (h - 80) + 40;
    drawStar(ctx, x, y, random() * 3 + 1, 4);
  }
}

function drawGlowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, glow: number): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function drawClassicSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`classic|${type}`)
): void {
  const face = getSpecialCardFace(type);
  const { palette } = face;
  drawClassicStock(ctx, { w, h }, face, random);

  const { emblem, value } = layoutSpecialFace({ x: w / 2, y: h / 2 - 20 }, EMBLEM_RADIUS, face);
  const halo = ctx.createRadialGradient(emblem.x, emblem.y, emblem.size * 0.4, emblem.x, emblem.y, emblem.size * HALO_SCALE);
  halo.addColorStop(0, withAlpha(palette.glow, 0.45));
  halo.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(emblem.x, emblem.y, emblem.size * HALO_SCALE, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(emblem.x, emblem.y, emblem.size * RING_SCALE, 0, Math.PI * 2);
  ctx.stroke();

  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: EMBLEM_OUTLINE });

  if (value && face.valueLabel) {
    drawGlowText(ctx, face.valueLabel, value.x, value.y, `bold ${value.fontSize}px ${SERIF}`, palette.metal, VALUE_GLOW);
  }

  const titleSize = fitFontSize(ctx, face.title, (px) => `bold ${px}px ${SERIF}`, TITLE.SIZE, TITLE.MAX_WIDTH);
  drawGlowText(ctx, face.title, w / 2, h - TITLE.OFFSET, `bold ${titleSize}px ${SERIF}`, palette.metal, TITLE.GLOW);

  const cornerSize = fitFontSize(ctx, face.cornerLabel, (px) => `bold ${px}px ${SERIF}`, CORNER.SIZE, CORNER.MAX_WIDTH);
  drawMirroredCorners(ctx, { w, h }, { x: CORNER.X, y: CORNER.Y }, () => {
    ctx.fillStyle = palette.metal;
    ctx.font = `bold ${cornerSize}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face.cornerLabel, 0, 0);
    drawStar(ctx, 0, CORNER.STAR_DROP, CORNER.STAR, 5);
  });
}
