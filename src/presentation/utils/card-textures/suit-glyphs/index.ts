import { SUIT_GLYPH } from '@/presentation/config/card-render.config';
import { GlyphPen, type GlyphPathSink } from './glyph-pen';
import { BASIC_GLYPHS, type GlyphBuilder } from './glyph-shapes-basic';
import { EMBLEM_GLYPHS } from './glyph-shapes-emblems';

/**
 * Suit symbols on card faces are drawn as vector outlines, never as font glyphs: symbols such as
 * ⛰ ⚒ ⚙ ⚡ have an emoji presentation, so Edge, WebKit and Firefox would each draw different
 * (and on Apple, full-colour) art that ignores the theme colours. Every canvasSymbol used by a
 * card theme has an outline here (suit-glyphs.test.ts enforces it).
 */
const SUIT_GLYPHS: Readonly<Record<string, GlyphBuilder>> = { ...BASIC_GLYPHS, ...EMBLEM_GLYPHS };

/** Forces the text (monochrome) presentation of a symbol in the font fallback path */
const TEXT_PRESENTATION_SELECTOR = '︎';
const FONT_SIZE_PATTERN = /(\d+(?:\.\d+)?)px/;

function fontSizeOf(ctx: CanvasRenderingContext2D): number {
  const match = FONT_SIZE_PATTERN.exec(String(ctx.font ?? ''));
  return match ? Number(match[1]) : SUIT_GLYPH.FALLBACK_FONT_PX;
}

/** A lone non-ASCII symbol gets the text-presentation selector; words and numbers are untouched */
function fallbackText(text: string): string {
  const isLoneSymbol = Array.from(text).length === 1 && text.charCodeAt(0) > 0x7f;
  return isLoneSymbol ? `${text}${TEXT_PRESENTATION_SELECTOR}` : text;
}

/** Builds the glyph's outline as the current path, centred on (x, y) at the context's font size */
function traceGlyph(ctx: CanvasRenderingContext2D, build: GlyphBuilder, x: number, y: number): void {
  ctx.beginPath();
  build(new GlyphPen(ctx, x, y, fontSizeOf(ctx) * SUIT_GLYPH.EM_SCALE));
}

/**
 * fillText for card art: a registered suit symbol is filled as a vector outline centred on
 * (x, y) at the current font size (callers draw symbols with textAlign center / baseline
 * middle); anything else is drawn as text.
 */
export function fillSymbolText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  const build = SUIT_GLYPHS[text];
  if (!build) {
    ctx.fillText(fallbackText(text), x, y);
    return;
  }
  traceGlyph(ctx, build, x, y);
  ctx.fill();
}

/**
 * Traces a registered suit symbol's outline into any path sink, centred on (0, 0) in a box `size`
 * across (y down, like canvas). Returns false, tracing nothing, for symbols without an outline.
 */
export function traceSuitGlyph(sink: GlyphPathSink, symbol: string, size: number): boolean {
  const build = SUIT_GLYPHS[symbol];
  if (!build) return false;
  build(new GlyphPen(sink, 0, 0, size));
  return true;
}

/** strokeText counterpart of fillSymbolText (outlines, neon tubes, ink rims) */
export function strokeSymbolText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  const build = SUIT_GLYPHS[text];
  if (!build) {
    ctx.strokeText(fallbackText(text), x, y);
    return;
  }
  traceGlyph(ctx, build, x, y);
  ctx.stroke();
}
