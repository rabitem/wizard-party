import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { blotch, paintTexture, seededRandom } from '../surface-textures';

const TILE_PX = 16;
const GROUT = '#dbe4e8';
const DEEP_BAND = ['#1565a8', '#1f7fc4', '#1a70b4'];
const MOSAIC = ['#3aa0d8', '#8fd0ef', '#ffffff', '#5fb8e6', '#2a8ccc', '#bfe6f5'];
const WHITE_BAND = ['#f4f7f8', '#eef3f5', '#ffffff', '#d6eef8'];

/** Deck tiles repeat this many times around the rim. */
export const DECK_REPEAT = 6;

/** Rows are counted from the pool side (canvas bottom = inner edge, v = 0). */
function tilePalette(rowFromPool: number, rows: number): readonly string[] {
  if (rowFromPool < 2) return DEEP_BAND;
  if (rowFromPool >= rows - 2) return WHITE_BAND;
  return MOSAIC;
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, TILE_PX - 2, TILE_PX - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 2, y + 2, TILE_PX - 6, 1.5);
}

/** Blue/white mosaic deck: deep blue band by the water, mixed mosaic, white border outside. */
export function paintDeckMosaic() {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = GROUT;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(91);
      const rows = h / TILE_PX;
      for (let row = 0; row < rows; row++) {
        const tones = tilePalette(rows - 1 - row, rows);
        for (let x = 0; x < w; x += TILE_PX) drawTile(ctx, x, row * TILE_PX, tones[Math.floor(rand() * tones.length)]);
      }
    },
    { repeat: [DECK_REPEAT, 1] },
  );
}

/** Wet look: glossy (dark) by the water and in splash puddles, matte grout and dry tiles further out. */
export function paintDeckWetness() {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, '#202020');
      gradient.addColorStop(0.35, '#555555');
      gradient.addColorStop(1, '#a8a8a8');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(92);
      for (let i = 0; i < 14; i++) blotch(ctx, [rand() * w, h * (0.3 + rand() * 0.7)], 14 + rand() * 30, '#101010', 0.8);
      ctx.fillStyle = 'rgba(230,230,230,0.5)';
      for (let x = 0; x < w; x += TILE_PX) ctx.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += TILE_PX) ctx.fillRect(0, y, w, 1);
    },
    { repeat: [DECK_REPEAT, 1], color: false },
  );
}

/** Inner pool wall: two rows of deep tiles under a white waterline stripe. */
export function paintWallTiles() {
  return paintTexture(
    256,
    32,
    (ctx, w, h) => {
      ctx.fillStyle = GROUT;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(93);
      for (let x = 0; x < w; x += TILE_PX) {
        drawTile(ctx, x, 0, WHITE_BAND[Math.floor(rand() * WHITE_BAND.length)]);
        drawTile(ctx, x, TILE_PX, DEEP_BAND[Math.floor(rand() * DEEP_BAND.length)]);
      }
    },
    { repeat: [44, 1] },
  );
}

/** Red/white segments around an inflatable ring. */
export function paintRingStripes() {
  return paintTexture(64, 8, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f0453a' : '#fbfbf6';
      ctx.fillRect((i / 8) * w, 0, w / 8, h);
    }
  });
}

/** Air mattress: aqua with lighter air channels along its length. */
export function paintMattress() {
  return paintTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#4fc6e8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fe6f6';
    for (let x = 4; x < w; x += 12) ctx.fillRect(x, 0, 4, h);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, h - 10, w, 4);
  });
}
