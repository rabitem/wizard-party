'use client';

/**
 * Registry of card face renderers per art style (strategy pattern).
 * 'classic' maps to the original drawing functions untouched.
 */

import type { SpecialCardType } from '@shared/domain';
import type { CardArtStyle } from '@/presentation/components/settings/card-theme-presets';
import { drawJesterCard } from './jester-card-drawing';
import { drawNumberCard, type DrawNumberCardParams } from './numbered-card-drawing';
import { drawClassicSpecialCard } from './special-cards';
import { drawWizardCard } from './wizard-card-drawing';
import {
  drawHyperrealJesterCard,
  drawHyperrealNumberCard,
  drawHyperrealSpecialCard,
  drawHyperrealWizardCard,
} from './styles/hyperreal-style';
import { drawMangaJesterCard, drawMangaNumberCard, drawMangaWizardCard } from './styles/manga-style';
import { drawMangaSpecialCard } from './styles/manga-special-card';
import { drawNeonJesterCard, drawNeonNumberCard, drawNeonSpecialCard, drawNeonWizardCard } from './styles/neon-style';
import { drawPixelJesterCard, drawPixelNumberCard, drawPixelSpecialCard, drawPixelWizardCard } from './styles/pixel-style';
import {
  drawSolarpunkJesterCard,
  drawSolarpunkNumberCard,
  drawSolarpunkSpecialCard,
  drawSolarpunkWizardCard,
} from './styles/solarpunk-style';
import { drawTarotJesterCard, drawTarotNumberCard, drawTarotSpecialCard, drawTarotWizardCard } from './styles/tarot-style';

export type { CardArtStyle };

export interface CardArtRenderer {
  drawNumberCard: (params: DrawNumberCardParams) => void;
  drawWizardCard: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  drawJesterCard: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Any expansion special card; the style composes its frame around the shared emblem */
  drawSpecialCard: (ctx: CanvasRenderingContext2D, w: number, h: number, type: SpecialCardType) => void;
}

export const DEFAULT_CARD_ART_STYLE: CardArtStyle = 'classic';

const CARD_ART_RENDERERS: Record<CardArtStyle, CardArtRenderer> = {
  classic: {
    drawNumberCard,
    drawWizardCard,
    drawJesterCard,
    drawSpecialCard: (ctx, w, h, type) => drawClassicSpecialCard(ctx, w, h, type),
  },
  manga: {
    drawNumberCard: drawMangaNumberCard,
    drawWizardCard: (ctx, w, h) => drawMangaWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawMangaJesterCard(ctx, w, h),
    drawSpecialCard: (ctx, w, h, type) => drawMangaSpecialCard(ctx, w, h, type),
  },
  hyperreal: {
    drawNumberCard: drawHyperrealNumberCard,
    drawWizardCard: (ctx, w, h) => drawHyperrealWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawHyperrealJesterCard(ctx, w, h),
    drawSpecialCard: (ctx, w, h, type) => drawHyperrealSpecialCard(ctx, w, h, type),
  },
  neon: {
    drawNumberCard: drawNeonNumberCard,
    drawWizardCard: (ctx, w, h) => drawNeonWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawNeonJesterCard(ctx, w, h),
    drawSpecialCard: (ctx, w, h, type) => drawNeonSpecialCard(ctx, w, h, type),
  },
  pixel: {
    drawNumberCard: drawPixelNumberCard,
    drawWizardCard: (ctx, w, h) => drawPixelWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawPixelJesterCard(ctx, w, h),
    drawSpecialCard: drawPixelSpecialCard,
  },
  tarot: {
    drawNumberCard: drawTarotNumberCard,
    drawWizardCard: (ctx, w, h) => drawTarotWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawTarotJesterCard(ctx, w, h),
    drawSpecialCard: (ctx, w, h, type) => drawTarotSpecialCard(ctx, w, h, type),
  },
  solarpunk: {
    drawNumberCard: drawSolarpunkNumberCard,
    drawWizardCard: (ctx, w, h) => drawSolarpunkWizardCard(ctx, w, h),
    drawJesterCard: (ctx, w, h) => drawSolarpunkJesterCard(ctx, w, h),
    drawSpecialCard: (ctx, w, h, type) => drawSolarpunkSpecialCard(ctx, w, h, type),
  },
};

/** Renderer for an art style; unknown or missing styles fall back to classic */
export function getCardArtRenderer(style: CardArtStyle | undefined): CardArtRenderer {
  return CARD_ART_RENDERERS[style ?? DEFAULT_CARD_ART_STYLE] ?? CARD_ART_RENDERERS[DEFAULT_CARD_ART_STYLE];
}
