import { seededRandom } from '../instancing';
import { tileableFbm } from './noise';

/** Procedural surface kinds with colour, roughness and height (-> normal) maps. */
export type PbrSurface = 'wood' | 'stone' | 'brick' | 'plaster' | 'fabric' | 'snow' | 'wetFloor';

export type Rgb = readonly [number, number, number];

/** Per-pixel channels in 0..1 (albedo is sRGB, 3 floats per pixel). */
export interface PbrPixels {
  size: number;
  albedo: Float32Array;
  roughness: Float32Array;
  height: Float32Array;
}

export interface PaintInput {
  size: number;
  seed: number;
  /** Main and secondary colour as sRGB 0..1 */
  base: Rgb;
  accent: Rgb;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function allocate(size: number): PbrPixels {
  return {
    size,
    albedo: new Float32Array(size * size * 3),
    roughness: new Float32Array(size * size),
    height: new Float32Array(size * size),
  };
}

function writeColor(out: PbrPixels, i: number, color: Rgb, shade: number): void {
  out.albedo[i * 3] = clamp01(color[0] * shade);
  out.albedo[i * 3 + 1] = clamp01(color[1] * shade);
  out.albedo[i * 3 + 2] = clamp01(color[2] * shade);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Wood planks running along u with growth-ring grain, plank tone jitter and dark seams. */
function paintWood({ size, seed, base, accent }: PaintInput): PbrPixels {
  const out = allocate(size);
  const rand = seededRandom(seed);
  const rows = 6;
  const grain = tileableFbm(size, seed, 3, 4);
  const fine = tileableFbm(size, seed + 1, 16, 2);
  const tones = Array.from({ length: rows }, () => 0.82 + rand() * 0.3);
  const joints = Array.from({ length: rows }, () => rand());
  const rowHeight = size / rows;
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / rowHeight);
    const inRow = (y % rowHeight) / rowHeight;
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = x / size;
      // Rings stretched along u: sample the noise with v compressed 4x (still tiles).
      const warp = grain[((y * 4 + row * 37) % size) * size + x];
      const ring = 0.5 + 0.5 * Math.sin((inRow * 9 + warp * 7 + row * 3.1) * Math.PI);
      const seam = Math.min(inRow, 1 - inRow) < 0.035 || Math.abs(((u + joints[row]) % 1) - 0.5) < 0.004;
      const shade = tones[row] * (0.85 + 0.15 * fine[i]) * (seam ? 0.45 : 1);
      writeColor(out, i, mix(base, accent, ring * 0.55), shade);
      out.height[i] = seam ? 0 : 0.55 + ring * 0.12 + fine[i] * 0.08;
      out.roughness[i] = seam ? 0.95 : 0.62 + ring * 0.12 + fine[i] * 0.1;
    }
  }
  return out;
}

/** Staggered blocks (bricks: many short rows; stone: fewer large irregular blocks). */
function paintBlocks(input: PaintInput, rows: number, cols: number, irregular: number): PbrPixels {
  const { size, seed, base, accent } = input;
  const out = allocate(size);
  const rand = seededRandom(seed);
  const noise = tileableFbm(size, seed, 8, 4);
  const chips = tileableFbm(size, seed + 2, 32, 2);
  const tones = Array.from({ length: rows * cols }, () => 0.8 + rand() * 0.35);
  const rowHeight = size / rows;
  const colWidth = size / cols;
  const mortar = 0.045;
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / rowHeight);
    const v = (y % rowHeight) / rowHeight;
    const stagger = (row % 2) * 0.5 * colWidth;
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const sx = (x + stagger) % size;
      const col = Math.floor(sx / colWidth);
      const u = (sx % colWidth) / colWidth;
      const wobble = (noise[i] - 0.5) * irregular;
      const edge = Math.min(u, 1 - u, v * (colWidth / rowHeight), (1 - v) * (colWidth / rowHeight)) + wobble * 0.05;
      const isMortar = edge < mortar;
      const bevel = clamp01((edge - mortar) / 0.06);
      const tone = tones[(row * cols + col) % tones.length];
      if (isMortar) {
        writeColor(out, i, accent, 0.9 + chips[i] * 0.2);
        out.height[i] = 0.1 + chips[i] * 0.05;
        out.roughness[i] = 0.95;
      } else {
        writeColor(out, i, base, tone * (0.82 + noise[i] * 0.3) * (chips[i] > 0.78 ? 0.85 : 1));
        out.height[i] = 0.4 + bevel * 0.35 + noise[i] * 0.2 - (chips[i] > 0.78 ? 0.08 : 0);
        out.roughness[i] = 0.78 + noise[i] * 0.18;
      }
    }
  }
  return out;
}

/** Hand-troweled plaster: broad blotches plus fine grit. */
function paintPlaster({ size, seed, base, accent }: PaintInput): PbrPixels {
  const out = allocate(size);
  const blotch = tileableFbm(size, seed, 3, 5, 0.55);
  const grit = tileableFbm(size, seed + 5, 48, 2);
  for (let i = 0; i < size * size; i++) {
    writeColor(out, i, mix(base, accent, blotch[i] * 0.6), 0.9 + grit[i] * 0.14);
    out.height[i] = blotch[i] * 0.6 + grit[i] * 0.4;
    out.roughness[i] = 0.82 + grit[i] * 0.15;
  }
  return out;
}

/** Plain weave: alternating warp/weft threads with fibre noise. */
function paintFabric({ size, seed, base, accent }: PaintInput): PbrPixels {
  const out = allocate(size);
  const fibre = tileableFbm(size, seed, 64, 2);
  const mottling = tileableFbm(size, seed + 3, 4, 3);
  const threads = 64;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const tu = (x / size) * threads;
      const tv = (y / size) * threads;
      const over = (Math.floor(tu) + Math.floor(tv)) % 2 === 0;
      const across = over ? Math.sin((tv % 1) * Math.PI) : Math.sin((tu % 1) * Math.PI);
      const thread = 0.55 + 0.45 * across;
      writeColor(out, i, mix(base, accent, mottling[i] * 0.35), 0.75 + thread * 0.3 + fibre[i] * 0.08);
      out.height[i] = thread * 0.8 + fibre[i] * 0.2;
      out.roughness[i] = 0.88 + fibre[i] * 0.1;
    }
  }
  return out;
}

/** Wind-packed snow: soft drifts, blue-ish hollows and sparse sparkle glints (low roughness). */
function paintSnow({ size, seed, base, accent }: PaintInput): PbrPixels {
  const out = allocate(size);
  const drifts = tileableFbm(size, seed, 3, 5, 0.5);
  const grain = tileableFbm(size, seed + 7, 64, 2);
  const rand = seededRandom(seed + 11);
  for (let i = 0; i < size * size; i++) {
    const sparkle = rand() > 0.9965;
    writeColor(out, i, mix(accent, base, clamp01(0.45 + (drifts[i] - 0.5) * 1.6)), sparkle ? 1.15 : 0.95 + grain[i] * 0.06);
    out.height[i] = drifts[i] * 0.85 + grain[i] * 0.15;
    out.roughness[i] = sparkle ? 0.08 : 0.72 + grain[i] * 0.2;
  }
  return out;
}

/** Stone tiles with puddles: puddles are dark, flat and mirror-smooth. */
function paintWetFloor(input: PaintInput): PbrPixels {
  const out = paintBlocks(input, 4, 4, 0.6);
  const puddles = tileableFbm(input.size, input.seed + 13, 2, 4, 0.55);
  for (let i = 0; i < input.size * input.size; i++) {
    const wet = clamp01((puddles[i] - 0.5) / 0.08);
    const damp = 0.35 + 0.65 * wet;
    out.albedo[i * 3] *= 1 - damp * 0.35;
    out.albedo[i * 3 + 1] *= 1 - damp * 0.35;
    out.albedo[i * 3 + 2] *= 1 - damp * 0.3;
    out.roughness[i] = out.roughness[i] * (1 - damp) + 0.06 * damp;
    out.height[i] = out.height[i] * (1 - wet) + 0.45 * wet;
  }
  return out;
}

export const PBR_PAINTERS: Readonly<Record<PbrSurface, (input: PaintInput) => PbrPixels>> = {
  wood: paintWood,
  stone: (input) => paintBlocks(input, 4, 3, 1),
  brick: (input) => paintBlocks(input, 10, 4, 0.25),
  plaster: paintPlaster,
  fabric: paintFabric,
  snow: paintSnow,
  wetFloor: paintWetFloor,
};

/** Default colours per surface (sRGB hex): [base, accent]. */
export const PBR_DEFAULT_COLORS: Readonly<Record<PbrSurface, readonly [string, string]>> = {
  wood: ['#7a4e2d', '#4a2c17'],
  stone: ['#8a8580', '#5d5955'],
  brick: ['#8e4433', '#c8bfb2'],
  plaster: ['#e8dfd0', '#cfc2ad'],
  fabric: ['#7d2a2a', '#5a1d1d'],
  snow: ['#ffffff', '#c9d8ee'],
  wetFloor: ['#5f6266', '#3a3c40'],
};
