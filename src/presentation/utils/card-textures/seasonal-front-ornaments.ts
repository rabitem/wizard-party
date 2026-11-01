'use client';

/**
 * Seasonal flourishes drawn on top of classic-style card fronts:
 * a motif in the two free corners (top-right, bottom-left; the value corners
 * stay untouched), a small motif at the top and bottom of the frame, and
 * themed accents at the side midpoints.
 */

import type { SeasonalCardStyle } from '@/presentation/components/settings/card-back-presets';
import {
  drawAcorn,
  drawCornerWeb,
  drawFlower,
  drawMapleLeaf,
  drawPumpkin,
  drawSnowflake,
  drawSun,
  drawLeaf,
  type Point,
} from './card-backs/motif-primitives';
import { drawStar } from './drawing-utils';

export interface SeasonalOrnamentColors {
  /** Main ornament colour (usually the suit's gold) */
  main: string;
  /** Secondary detail colour (usually the suit's accent) */
  accent: string;
  /** Darkest colour of the card, used for detail lines */
  shade: string;
}

/** Distance of the corner motif centre from the card edge */
const ORNAMENT_CORNER_INSET = 56;
/** Corner motif size */
const ORNAMENT_SIZE = 20;
/** Distance of the frame motifs from the edge (sits on the outer frame) */
const ORNAMENT_FRAME_INSET = 18;
const ORNAMENT_FRAME_SIZE = 9;
const ORNAMENT_ALPHA = 0.92;

type MotifDrawer = (ctx: CanvasRenderingContext2D, p: Point, size: number, colors: SeasonalOrnamentColors, angle: number) => void;

const CORNER_MOTIFS: Record<SeasonalCardStyle, MotifDrawer> = {
  halloween: (ctx, p, s, c) => drawPumpkin(ctx, p, s * 0.8, { body: c.main, rib: c.shade, stem: c.accent, face: c.shade }),
  autumn: (ctx, p, s, c, angle) => {
    drawMapleLeaf(ctx, { x: p.x - s * 0.35, y: p.y }, s * 0.75, angle - 0.4, c.accent);
    drawAcorn(ctx, { x: p.x + s * 0.4, y: p.y + s * 0.2 }, s * 0.6, c.main, c.shade);
  },
  winter: (ctx, p, s, c) => drawSnowflake(ctx, p, s, c.main),
  spring: (ctx, p, s, c) => drawFlower(ctx, p, s, 5, { petal: c.main, center: c.accent }),
  summer: (ctx, p, s, c) => drawSun(ctx, p, s * 0.5, 12, c.main),
};

const FRAME_MOTIFS: Record<SeasonalCardStyle, MotifDrawer> = {
  halloween: (ctx, p, s, c) => {
    ctx.fillStyle = c.main;
    drawStar(ctx, p.x, p.y, s, 4);
  },
  autumn: (ctx, p, s, c, angle) => drawLeaf(ctx, p, s, angle, { color: c.main, vein: c.shade }),
  winter: (ctx, p, s, c) => drawSnowflake(ctx, p, s, c.main),
  spring: (ctx, p, s, c, angle) => drawLeaf(ctx, p, s, angle, { color: c.accent }),
  summer: (ctx, p, s, c) => {
    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
  },
};

/** Draws the seasonal corner and frame flourishes for a classic-style card front */
export function drawSeasonalFrontOrnaments(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  season: SeasonalCardStyle,
  colors: SeasonalOrnamentColors
): void {
  ctx.save();
  ctx.globalAlpha = ORNAMENT_ALPHA;

  if (season === 'halloween') {
    ctx.strokeStyle = colors.main;
    ctx.lineWidth = 1.2;
    drawCornerWeb(ctx, { x: w - 24, y: 24 }, 44, -1, 1);
    drawCornerWeb(ctx, { x: 24, y: h - 24 }, 44, 1, -1);
  }

  const corner = CORNER_MOTIFS[season];
  corner(ctx, { x: w - ORNAMENT_CORNER_INSET, y: ORNAMENT_CORNER_INSET }, ORNAMENT_SIZE, colors, 0);
  corner(ctx, { x: ORNAMENT_CORNER_INSET, y: h - ORNAMENT_CORNER_INSET }, ORNAMENT_SIZE, colors, Math.PI);

  const frame = FRAME_MOTIFS[season];
  frame(ctx, { x: w / 2, y: ORNAMENT_FRAME_INSET }, ORNAMENT_FRAME_SIZE, colors, Math.PI / 2);
  frame(ctx, { x: w / 2, y: h - ORNAMENT_FRAME_INSET }, ORNAMENT_FRAME_SIZE, colors, -Math.PI / 2);
  frame(ctx, { x: ORNAMENT_FRAME_INSET, y: h / 2 }, ORNAMENT_FRAME_SIZE, colors, 0);
  frame(ctx, { x: w - ORNAMENT_FRAME_INSET, y: h / 2 }, ORNAMENT_FRAME_SIZE, colors, Math.PI);

  ctx.restore();
}
