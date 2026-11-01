import type * as THREE from 'three';
import { MANGA_COLORS, MANGA_ROOM } from '@/presentation/config/manga-environment.config';
import { createPaintedTexture } from '../primitives/canvas-texture';
import { seededRandom } from '../primitives/instancing';
import { tile } from './manga-textures';

/**
 * Dojo surfaces: backlit shoji walls (colour + matching glow map) and woven
 * tatami (colour + bump map). Builders return fresh textures; components
 * memoise and dispose them.
 */

const SHOJI_SIZE = { W: 256, H: 512 } as const;
const SHOJI_GRID = { ROWS: 9, COLUMNS: 4 } as const;
const TATAMI_SIZE = 256;
/** Pixels between woven rush strands */
const WEAVE_PITCH = 3;
const FIBRES = 420;

interface ShojiLayout {
  beamTop: number;
  beamBottom: number;
  kick: number;
  doorWidth: number;
  paneHeight: number;
}

/** Pixel rows/columns of one wall section, shared by the colour and glow maps so they line up. */
function shojiLayout(w: number, h: number): ShojiLayout {
  const { HEIGHT, BEAM_HEIGHT, KICKBOARD_HEIGHT } = MANGA_ROOM;
  const beamTop = (1 - BEAM_HEIGHT / HEIGHT) * h;
  const beamBottom = beamTop + h * 0.03;
  const kick = (1 - KICKBOARD_HEIGHT / HEIGHT) * h;
  return { beamTop, beamBottom, kick, doorWidth: w / 2, paneHeight: (kick - beamBottom) / SHOJI_GRID.ROWS };
}

/** Kumiko lattice bars and door frames. */
function drawLattice(ctx: CanvasRenderingContext2D, w: number, layout: ShojiLayout, bar: string, frame: string): void {
  const { beamBottom, kick, doorWidth, paneHeight } = layout;
  const height = kick - beamBottom;
  ctx.fillStyle = bar;
  for (let r = 1; r < SHOJI_GRID.ROWS; r++) ctx.fillRect(0, beamBottom + r * paneHeight - 1.5, w, 3);
  for (let d = 0; d < 2; d++) {
    for (let c = 1; c < SHOJI_GRID.COLUMNS; c++) ctx.fillRect(d * doorWidth + (c * doorWidth) / SHOJI_GRID.COLUMNS - 1.5, beamBottom, 3, height);
  }
  // Door frames (edges are half width so the repeat seams to a full frame).
  ctx.fillStyle = frame;
  ctx.fillRect(0, beamBottom, 5, height);
  ctx.fillRect(w - 5, beamBottom, 5, height);
  ctx.fillRect(doorWidth - 5, beamBottom, 10, height);
}

/** Washi fibres: short pale and dark curls scattered over the paper. */
interface FibreArea {
  width: number;
  top: number;
  bottom: number;
}

function drawWashiFibres(ctx: CanvasRenderingContext2D, { width: w, top, bottom }: FibreArea, colors: readonly [string, string], seed: number): void {
  const rand = seededRandom(seed);
  ctx.lineWidth = 0.8;
  for (let i = 0; i < FIBRES; i++) {
    const x = rand() * w;
    const y = top + rand() * (bottom - top);
    const length = 3 + rand() * 9;
    ctx.strokeStyle = colors[rand() > 0.45 ? 1 : 0];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * length, y + (rand() - 0.5) * length, x + (rand() - 0.5) * length * 1.4, y + (rand() - 0.5) * length * 1.4);
    ctx.stroke();
  }
}

function tileShoji(texture: THREE.Texture): THREE.Texture {
  return tile(texture, [(MANGA_ROOM.HALF_WIDTH * 2) / MANGA_ROOM.SHOJI_SECTION, 1]);
}

/**
 * One wall section (SHOJI_SECTION wide, full room height): plaster above the
 * nageshi beam, two shoji doors with a kumiko lattice over fibrous washi,
 * wooden kickboard.
 */
export function createShojiTexture(): THREE.Texture {
  const texture = createPaintedTexture(SHOJI_SIZE.W, SHOJI_SIZE.H, (ctx, w, h) => {
    const layout = shojiLayout(w, h);
    const { beamTop, beamBottom, kick } = layout;
    const rand = seededRandom(31);

    ctx.fillStyle = MANGA_COLORS.plaster;
    ctx.fillRect(0, 0, w, beamTop);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(80,70,55,${0.03 + rand() * 0.05})`;
      ctx.fillRect(rand() * w, rand() * beamTop, 2, 2);
    }
    ctx.fillStyle = MANGA_COLORS.paper;
    ctx.fillRect(0, beamBottom, w, kick - beamBottom);
    drawWashiFibres(ctx, { width: w, top: beamBottom, bottom: kick }, ['rgba(120,100,70,0.09)', 'rgba(255,255,250,0.35)'], 33);
    drawLattice(ctx, w, layout, MANGA_COLORS.woodDark, MANGA_COLORS.wood);

    ctx.fillStyle = MANGA_COLORS.woodDark;
    ctx.fillRect(0, beamTop, w, beamBottom - beamTop);
    ctx.fillStyle = MANGA_COLORS.wood;
    ctx.fillRect(0, kick, w, h - kick);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = kick + 6; y < h; y += 7) ctx.fillRect(0, y, w, 1);
  });
  return tileShoji(texture);
}

/**
 * Emissive map for the shoji walls: only the paper panes glow (daylight
 * behind the paper, a little brighter towards the top, uneven where the
 * fibres are thicker); lattice, frames, beam, plaster and kickboard stay dark.
 */
export function createShojiGlowTexture(): THREE.Texture {
  const texture = createPaintedTexture(SHOJI_SIZE.W, SHOJI_SIZE.H, (ctx, w, h) => {
    const layout = shojiLayout(w, h);
    const { beamBottom, kick } = layout;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const daylight = ctx.createLinearGradient(0, beamBottom, 0, kick);
    daylight.addColorStop(0, '#ffffff');
    daylight.addColorStop(1, '#b4b4b4');
    ctx.fillStyle = daylight;
    ctx.fillRect(0, beamBottom, w, kick - beamBottom);
    drawWashiFibres(ctx, { width: w, top: beamBottom, bottom: kick }, ['rgba(0,0,0,0.14)', 'rgba(255,255,255,0.2)'], 33);
    drawLattice(ctx, w, layout, '#000000', '#000000');
  });
  return tileShoji(texture);
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type MatPainter = (ctx: CanvasRenderingContext2D, rect: Rect, tone: string, rand: () => number) => void;

/** Colour: rush strands with per-strand tone jitter, dark heri borders on the long edges. */
const paintMatColor: MatPainter = (ctx, { x, y, w, h }, tone, rand) => {
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, w, h);
  for (let lx = x; lx < x + w; lx += WEAVE_PITCH) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? `rgba(255,250,210,${0.05 + rand() * 0.08})` : `rgba(70,60,20,${0.1 + rand() * 0.12})`;
    ctx.fillRect(lx, y, 1, h);
  }
  const border = h * 0.07;
  ctx.fillStyle = MANGA_COLORS.tatamiBorder;
  ctx.fillRect(x, y, w, border);
  ctx.fillRect(x, y + h - border, w, border);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, 1.5, h);
};

/** Height: ridged strands, flat raised borders, sunken seams. */
const paintMatBump: MatPainter = (ctx, { x, y, w, h }) => {
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5a5a5a';
  for (let lx = x; lx < x + w; lx += WEAVE_PITCH) ctx.fillRect(lx, y, 1, h);
  const border = h * 0.07;
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(x, y, w, border);
  ctx.fillRect(x, y + h - border, w, border);
  ctx.fillStyle = '#202020';
  ctx.fillRect(x, y, 1.5, h);
};

/** Two rows of mats in a running bond, painted with the given mat painter. */
function paintTatami(painter: MatPainter, seed: number): THREE.Texture {
  const texture = createPaintedTexture(TATAMI_SIZE, TATAMI_SIZE, (ctx, w, h) => {
    const rand = seededRandom(seed);
    const row = h / 2;
    painter(ctx, { x: 0, y: 0, w, h: row }, MANGA_COLORS.tatami, rand);
    painter(ctx, { x: -w / 2, y: row, w, h: row }, MANGA_COLORS.tatamiShade, rand);
    painter(ctx, { x: w / 2, y: row, w, h: row }, MANGA_COLORS.tatamiShade, rand);
  });
  return tile(texture, MANGA_ROOM.TATAMI_REPEAT);
}

/** Tatami colour map: woven rush with tone variation and dark heri borders. */
export function createTatamiTexture(): THREE.Texture {
  return paintTatami(paintMatColor, 47);
}

/** Matching bump map so the weave and borders catch the light. */
export function createTatamiBumpTexture(): THREE.Texture {
  return paintTatami(paintMatBump, 47);
}
