'use client';

/**
 * Manga card art style: crisp ink outlines, screentone shading, radiating
 * speed lines and bold outlined comic numbers. Mostly monochrome with one
 * spot colour per suit (SuitTheme.accent).
 *
 * Colour roles for number cards: primary = ink, secondary = paper,
 * accent = spot colour, gold = screentone tint.
 */

import { createSeededRandom, type RandomSource } from '../drawing-utils';
import { createNumberCardPatternSeed, type DrawNumberCardParams } from '../numbered-card-drawing';
import {
  MANGA_COMIC_FONT,
  clipToPanel,
  drawBurst,
  drawCaptionBox,
  drawComicText,
  drawHalftone,
  drawInkFrame,
  drawSpeedLines,
} from './manga-primitives';
import {
  drawMirroredCorners,
  getCornerLayout,
  starPath,
  withAlpha,
  type CardSize,
  type Point,
} from './style-shared';

export interface MangaColors {
  ink: string;
  paper: string;
  accent: string;
  tone: string;
}

const MANGA_WIZARD_COLORS: MangaColors = { ink: '#111111', paper: '#f5f2ff', accent: '#7c3aed', tone: '#3a3a3a' };
export const MANGA_JESTER_COLORS: MangaColors = { ink: '#111111', paper: '#fffaf0', accent: '#e11d48', tone: '#3a3a3a' };
export const CORNER_FONT_SIZE = 72;
export const TITLE_FONT_SIZE = 34;
const CAPTION_WIDTH = 290;
/** Room for the title inside the caption box */
export const CAPTION_TEXT_WIDTH = CAPTION_WIDTH - 30;

/** Paper, edge screentone and speed lines bursting out from the focus point */
export function drawMangaBackdrop(
  ctx: CanvasRenderingContext2D,
  { w, h }: CardSize,
  colors: MangaColors,
  focus: Point,
  random: RandomSource
): void {
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  clipToPanel(ctx, w, h);
  const half = h / 2;
  drawHalftone(ctx, { x: 0, y: 0, w, h }, 10, colors.tone, (_px, py) => {
    const t = Math.abs(py - half) / half;
    return 4.4 * t * t;
  });

  // Clean paper glow behind the focus so the emblem pops
  const glow = ctx.createRadialGradient(focus.x, focus.y, 60, focus.x, focus.y, 260);
  glow.addColorStop(0, colors.paper);
  glow.addColorStop(1, withAlpha(colors.paper, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  drawSpeedLines(ctx, focus, { innerRadius: 125, outerRadius: Math.hypot(w, h), count: 72 }, colors.ink, random);
  ctx.restore();
}

/** Paper disc with spot-colour screentone shading and heavy ink rings */
function drawMangaEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, colors: MangaColors): void {
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 104, 0, Math.PI * 2);
  ctx.clip();
  drawHalftone(ctx, { x: cx - 104, y: cy - 104, w: 208, h: 208 }, 8, colors.accent, (px, py) => {
    const t = Math.min(1, Math.max(0, (px - cx + (py - cy)) / 208 + 0.45));
    return 3.4 * t;
  });
  ctx.restore();

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 111, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 104, 0, Math.PI * 2);
  ctx.stroke();
}

/** Big outlined corner letter (W / J / special card index) with a small spot-colour sparkle */
export function drawMangaCornerLetter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  letter: string,
  colors: MangaColors,
  fontSize: number = CORNER_FONT_SIZE
): void {
  drawMirroredCorners(ctx, { w, h }, { x: 85, y: 90 }, () => {
    drawComicText(ctx, letter, 0, 0, {
      font: `${fontSize}px ${MANGA_COMIC_FONT}`,
      fill: colors.paper,
      ink: colors.ink,
      outline: 10,
      drop: 4,
    });
    drawBurst(ctx, { x: 0, y: 60, outer: 16, inner: 6, points: 4 }, { fill: colors.accent, ink: colors.ink, lineWidth: 2.5 });
  });
}

/** Card title in a caption-style text box */
export function drawMangaTitle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  colors: MangaColors,
  fontSize: number = TITLE_FONT_SIZE
): void {
  drawCaptionBox(ctx, { x: w / 2, y: h - 100, width: CAPTION_WIDTH, height: 60 }, colors.paper, colors.ink);
  drawComicText(ctx, text, w / 2, h - 100, {
    font: `${fontSize}px ${MANGA_COMIC_FONT}`,
    fill: colors.ink,
    ink: colors.ink,
    outline: 0,
  });
}

export function drawMangaNumberCard(params: DrawNumberCardParams): void {
  const { ctx, w, h, suit, value, theme, fontSizes, suitSymbols } = params;
  const random = params.random ?? createSeededRandom(`manga|${createNumberCardPatternSeed(suit, value, theme)}`);
  const colors: MangaColors = { ink: theme.primary, paper: theme.secondary, accent: theme.accent, tone: theme.gold };
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawMangaBackdrop(ctx, { w, h }, colors, { x: cx, y: cy }, random);
  drawMangaEmblem(ctx, cx, cy, colors);
  drawComicText(ctx, theme.canvasSymbol, cx, cy, {
    font: `${fontSizes.center}px Arial`,
    fill: colors.accent,
    ink: colors.ink,
    outline: Math.max(6, fontSizes.center * 0.07),
  });
  drawInkFrame(ctx, w, h, colors.ink, colors.accent);
  drawMangaTitle(ctx, w, h, theme.name, colors);

  const layout = getCornerLayout(value, fontSizes);
  const numberSize = Math.round(fontSizes.corner * (value >= 10 ? 0.82 : 0.95));
  drawMirroredCorners(ctx, { w, h }, layout, () => {
    drawBurst(
      ctx,
      { x: 0, y: 0, outer: layout.radius * 1.18, inner: layout.radius * 0.84, points: 12 },
      { fill: colors.accent, ink: colors.ink, lineWidth: 4 }
    );
    drawComicText(ctx, String(value), 0, numberSize * 0.05, {
      font: `${numberSize}px ${MANGA_COMIC_FONT}`,
      fill: colors.paper,
      ink: colors.ink,
      outline: Math.max(5, numberSize * 0.16),
      drop: 3,
    });
    drawComicText(ctx, suitSymbols[suit], 0, layout.radius + fontSizes.cornerSymbol * 0.8, {
      font: `${fontSizes.cornerSymbol}px Arial`,
      fill: colors.accent,
      ink: colors.ink,
      outline: 4,
    });
  });
}

export function drawMangaWizardCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('manga|wizard')
): void {
  const colors = MANGA_WIZARD_COLORS;
  const cx = w / 2;
  const cy = h / 2 - 20;

  drawMangaBackdrop(ctx, { w, h }, colors, { x: cx, y: cy }, random);
  drawBurst(ctx, { x: cx, y: cy, outer: 138, inner: 100, points: 22 }, { fill: colors.accent, ink: colors.ink, lineWidth: 6 });

  ctx.lineJoin = 'miter';
  starPath(ctx, { x: cx, y: cy, outer: 90, inner: 36, points: 5 });
  ctx.fillStyle = colors.paper;
  ctx.fill();
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 6;
  ctx.stroke();

  starPath(ctx, { x: cx, y: cy, outer: 42, inner: 17, points: 5 });
  ctx.fillStyle = colors.accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();

  // Sparkles scattered around the burst
  for (let i = 0; i < 5; i++) {
    const angle = random() * Math.PI * 2;
    const dist = 160 + random() * 40;
    const sparkle = { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, outer: 14, inner: 4, points: 4 };
    drawBurst(ctx, sparkle, { fill: colors.paper, ink: colors.ink, lineWidth: 2.5 });
  }

  drawInkFrame(ctx, w, h, colors.ink, colors.accent);
  drawComicText(ctx, 'WIZARD', w / 2, h - 100, {
    font: `50px ${MANGA_COMIC_FONT}`,
    fill: colors.accent,
    ink: colors.ink,
    outline: 9,
    drop: 4,
  });
  drawMangaCornerLetter(ctx, w, h, 'W', colors);
}

/** Ink-drawn jester: floppy three-point hat, closed happy eyes, big grin */
function drawMangaJesterFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, colors: MangaColors): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = colors.ink;
  const baseY = cy - 20;
  const tips: Array<[number, number]> = [[cx - 112, cy - 96], [cx, cy - 158], [cx + 112, cy - 96]];
  tips.forEach(([tx, ty], i) => {
    const x0 = cx - 75 + i * 50;
    const x1 = x0 + 50;
    const midY = (baseY + ty) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    ctx.quadraticCurveTo(x0 - 12, midY, tx, ty);
    ctx.quadraticCurveTo(x1 + 12, midY, x1, baseY);
    ctx.closePath();
    ctx.fillStyle = i === 1 ? colors.paper : colors.accent;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.stroke();
  });
  tips.forEach(([tx, ty], i) => {
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? colors.accent : colors.paper;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
  });

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy + 30, 62, 0, Math.PI * 2);
  ctx.fillStyle = colors.paper;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.stroke();

  // Hat brim
  ctx.fillStyle = colors.accent;
  ctx.fillRect(cx - 82, cy - 30, 164, 22);
  ctx.lineWidth = 5;
  ctx.strokeRect(cx - 82, cy - 30, 164, 22);

  // Closed happy eyes
  ctx.lineWidth = 5;
  for (const ex of [cx - 22, cx + 22]) {
    ctx.beginPath();
    ctx.arc(ex, cy + 24, 10, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // Open grin
  ctx.beginPath();
  ctx.arc(cx, cy + 40, 32, Math.PI * 0.12, Math.PI * 0.88);
  ctx.closePath();
  ctx.fillStyle = colors.ink;
  ctx.fill();

  // Nose
  ctx.beginPath();
  ctx.arc(cx, cy + 38, 9, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();

  // Blush hatching
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const bx = cx + side * (36 + i * 7);
      ctx.beginPath();
      ctx.moveTo(bx, cy + 44);
      ctx.lineTo(bx - 5, cy + 54);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

export function drawMangaJesterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: RandomSource = createSeededRandom('manga|jester')
): void {
  const colors = MANGA_JESTER_COLORS;
  const cx = w / 2;
  const cy = h / 2 - 30;

  drawMangaBackdrop(ctx, { w, h }, colors, { x: cx, y: cy }, random);
  drawMangaJesterFace(ctx, cx, cy, colors);
  drawInkFrame(ctx, w, h, colors.ink, colors.accent);
  drawMangaTitle(ctx, w, h, 'JESTER', colors);
  drawMangaCornerLetter(ctx, w, h, 'J', colors);
}
