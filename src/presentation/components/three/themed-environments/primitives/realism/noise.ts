import { seededRandom } from '../instancing';

/**
 * Tileable fractal value noise on a square grid, values in [0, 1]. Pure and
 * deterministic: used for fog, roughness variation and PBR height maps.
 *
 * @param size  output edge length in pixels
 * @param cells lattice cells across the first octave (wraps at the edge)
 */
export function tileableFbm(size: number, seed = 1, cells = 4, octaves = 4, persistence = 0.5): Float32Array {
  const out = new Float32Array(size * size);
  const rand = seededRandom(seed * 7919 + 3);
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    const lattice = cells << octave;
    const values = new Float32Array(lattice * lattice);
    for (let i = 0; i < values.length; i++) values[i] = rand();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * lattice;
      const y0 = Math.floor(fy);
      const ty = smooth(fy - y0);
      const row0 = (y0 % lattice) * lattice;
      const row1 = ((y0 + 1) % lattice) * lattice;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * lattice;
        const x0 = Math.floor(fx);
        const tx = smooth(fx - x0);
        const x1 = (x0 + 1) % lattice;
        const a = values[row0 + (x0 % lattice)] + (values[row0 + x1] - values[row0 + (x0 % lattice)]) * tx;
        const b = values[row1 + (x0 % lattice)] + (values[row1 + x1] - values[row1 + (x0 % lattice)]) * tx;
        out[y * size + x] += (a + (b - a) * ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= persistence;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Tangent-space normal map (RGBA bytes) from a tileable height field using
 * wrapped central differences. strength scales the slope.
 */
export function heightToNormalPixels(height: Float32Array, size: number, strength: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      pixels[i] = (-dx * inv * 0.5 + 0.5) * 255;
      // Canvas rows grow downward while texture v grows upward (flipY): keep +y up.
      pixels[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      pixels[i + 2] = (inv * 0.5 + 0.5) * 255;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}
