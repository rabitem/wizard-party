'use client';

/**
 * Vector emblems for the expansion special cards, shared by every art style.
 *
 * Each painter draws in a fixed unit space: origin at the emblem centre, the
 * art fits a circle of radius EMBLEM_UNIT. drawSpecialCardEmblem scales that
 * space to the requested frame, so painters hold plain path data and styles
 * only choose the frame, the palette and the ink outline width.
 *
 * Painters use flat fills (no gradients) so the pixel style can rasterise
 * them on its low-res grid; styles add their own lighting around them.
 */

import { CardType, type SpecialCardType } from '@shared/domain';
import { EMBLEM_UNIT, type EmblemFrame, type EmblemPainter, type EmblemPen } from './emblem-brush';
import { paintDragon, paintFairy, paintWerewolf, paintVampire } from './emblems-creatures';
import { paintBomb, paintJuggler, paintCloud, paintShapeshifter, paintWitch } from './emblems-arcana';

export { EMBLEM_UNIT, type EmblemFrame, type EmblemPainter, type EmblemPen } from './emblem-brush';

/** One painter per special card; a missing entry is a compile error */
export const SPECIAL_CARD_EMBLEMS: Readonly<Record<SpecialCardType, EmblemPainter>> = {
  [CardType.DRAGON]: paintDragon,
  [CardType.FAIRY]: paintFairy,
  [CardType.BOMB]: paintBomb,
  [CardType.WEREWOLF]: paintWerewolf,
  [CardType.JUGGLER]: paintJuggler,
  [CardType.CLOUD]: paintCloud,
  [CardType.SHAPESHIFTER]: paintShapeshifter,
  [CardType.VAMPIRE]: paintVampire,
  [CardType.WITCH]: paintWitch,
};

/** Draws a special card's emblem centred in `frame` */
export function drawSpecialCardEmblem(
  ctx: CanvasRenderingContext2D,
  type: SpecialCardType,
  frame: EmblemFrame,
  pen: EmblemPen
): void {
  const scale = frame.size / EMBLEM_UNIT;
  ctx.save();
  ctx.translate(frame.x, frame.y);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  SPECIAL_CARD_EMBLEMS[type]({ ctx, c: pen.palette, outline: pen.outline / scale });
  ctx.restore();
}
