'use client';

/**
 * Manga style for the expansion special cards (see manga-style.ts for the idiom).
 */

import type { SpecialCardType } from '@shared/domain';
import { createSeededRandom, type RandomSource } from '../drawing-utils';
import { drawSpecialCardEmblem, getSpecialCardFace, layoutSpecialFace, mapEmblemPalette } from '../special-cards';
import { MANGA_COMIC_FONT, drawBurst, drawComicText, drawInkFrame } from './manga-primitives';
import {
  CAPTION_TEXT_WIDTH,
  CORNER_FONT_SIZE,
  MANGA_JESTER_COLORS,
  TITLE_FONT_SIZE,
  drawMangaBackdrop,
  drawMangaCornerLetter,
  drawMangaTitle,
  type MangaColors,
} from './manga-style';
import { blendHex, fitFontSize, relativeLuminance } from './style-shared';

const MANGA_SPECIAL = {
  EMBLEM_RADIUS: 108,
  OUTLINE: 5,
  /** Spot-colour burst and paper disc behind the emblem, relative to its radius */
  BURST_OUTER: 1.3,
  BURST_INNER: 1.04,
  DISC: 1.06,
  CORNER_MAX_WIDTH: 90,
} as const;

/**
 * Special card: the emblem inked in greyscale (each colour becomes a tone of
 * its brightness) with the card's signature colour as the one spot colour.
 */
export function drawMangaSpecialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: SpecialCardType,
  random: RandomSource = createSeededRandom(`manga|${type}`)
): void {
  const face = getSpecialCardFace(type);
  const colors: MangaColors = { ...MANGA_JESTER_COLORS, accent: face.palette.signature };
  const { emblem, value } = layoutSpecialFace({ x: w / 2, y: h / 2 - 20 }, MANGA_SPECIAL.EMBLEM_RADIUS, face);

  drawMangaBackdrop(ctx, { w, h }, colors, emblem, random);
  drawBurst(
    ctx,
    { x: emblem.x, y: emblem.y, outer: emblem.size * MANGA_SPECIAL.BURST_OUTER, inner: emblem.size * MANGA_SPECIAL.BURST_INNER, points: 22 },
    { fill: colors.accent, ink: colors.ink, lineWidth: 6 }
  );
  ctx.beginPath();
  ctx.arc(emblem.x, emblem.y, emblem.size * MANGA_SPECIAL.DISC, 0, Math.PI * 2);
  ctx.fillStyle = colors.paper;
  ctx.fill();
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  const palette = mapEmblemPalette(face.palette, (color, token) => {
    if (token === 'accent') return colors.accent;
    if (token === 'ink') return colors.ink;
    return blendHex(colors.ink, colors.paper, relativeLuminance(color));
  });
  drawSpecialCardEmblem(ctx, type, emblem, { palette, outline: MANGA_SPECIAL.OUTLINE });

  if (value && face.valueLabel) {
    drawComicText(ctx, face.valueLabel, value.x, value.y, {
      font: `${value.fontSize}px ${MANGA_COMIC_FONT}`,
      fill: colors.accent,
      ink: colors.ink,
      outline: 10,
      drop: 4,
    });
  }
  drawInkFrame(ctx, w, h, colors.ink, colors.accent);
  const comic = (px: number) => `${px}px ${MANGA_COMIC_FONT}`;
  drawMangaTitle(ctx, w, h, face.title, colors, fitFontSize(ctx, face.title, comic, TITLE_FONT_SIZE, CAPTION_TEXT_WIDTH));
  drawMangaCornerLetter(ctx, w, h, face.cornerLabel, colors, fitFontSize(ctx, face.cornerLabel, comic, CORNER_FONT_SIZE, MANGA_SPECIAL.CORNER_MAX_WIDTH));
}
