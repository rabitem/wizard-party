'use client';

/**
 * Card back drawing (strategy per CardBackStyle).
 * 'classic' is the original deep blue star medallion, recoloured by the palette;
 * seasonal and stylized decks get fully illustrated backs.
 */

import {
  DEFAULT_CARD_BACK,
  type CardBackDesign,
  type CardBackStyle,
} from '@/presentation/components/settings/card-back-presets';
import { drawOrnateFrame, drawStar } from './drawing-utils';
import type { CardBackPainter } from './card-backs/back-shared';
import { paintAutumnBack, paintHalloweenBack } from './card-backs/halloween-autumn-backs';
import { paintSpringBack, paintSummerBack, paintWinterBack } from './card-backs/winter-spring-summer-backs';
import { paintHyperrealBack, paintMangaBack } from './card-backs/stylized-backs';
import { paintNeonBack } from './card-backs/neon-back';
import { paintPixelBack } from './card-backs/pixel-back';
import { paintSolarpunkBack } from './card-backs/solarpunk-back';
import { paintTarotBack } from './card-backs/tarot-back';

export type { CardBackPainter } from './card-backs/back-shared';

/** The original back, unchanged for the default palette */
export const paintClassicBack: CardBackPainter = (ctx, { w, h }, palette) => {
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 1.2);
  bgGrad.addColorStop(0, palette.base);
  bgGrad.addColorStop(1, palette.deep);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  drawOrnateFrame(ctx, w, h, palette.metal, palette.metalShade);

  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = palette.metal;
  drawStar(ctx, cx, cy, 80, 8);

  ctx.fillStyle = palette.base;
  drawStar(ctx, cx, cy, 50, 8);

  ctx.fillStyle = palette.metal;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx + 25, cy);
  ctx.lineTo(cx, cy + 30);
  ctx.lineTo(cx - 25, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.metal;
  drawStar(ctx, 50, 50, 15, 4);
  drawStar(ctx, w - 50, 50, 15, 4);
  drawStar(ctx, 50, h - 50, 15, 4);
  drawStar(ctx, w - 50, h - 50, 15, 4);
};

const CARD_BACK_PAINTERS: Record<CardBackStyle, CardBackPainter> = {
  classic: paintClassicBack,
  halloween: paintHalloweenBack,
  autumn: paintAutumnBack,
  winter: paintWinterBack,
  spring: paintSpringBack,
  summer: paintSummerBack,
  manga: paintMangaBack,
  hyperreal: paintHyperrealBack,
  neon: paintNeonBack,
  pixel: paintPixelBack,
  tarot: paintTarotBack,
  solarpunk: paintSolarpunkBack,
};

/** Painter for a back style; unknown styles fall back to classic */
export function getCardBackPainter(style: CardBackStyle | undefined): CardBackPainter {
  return CARD_BACK_PAINTERS[style ?? 'classic'] ?? paintClassicBack;
}

/** Draws a full card back of the given design onto the canvas context */
export function drawCardBack(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  design: CardBackDesign = DEFAULT_CARD_BACK
): void {
  ctx.save();
  getCardBackPainter(design.style)(ctx, { w, h }, design.palette);
  ctx.restore();
}
