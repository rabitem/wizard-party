import * as THREE from 'three';

export { seededRandom } from '@/presentation/components/three/themed-environments/primitives/instancing';

export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

export interface CanvasTextureOptions {
  /** Texture repeat (sets RepeatWrapping) */
  repeat?: readonly [number, number];
  /** Crisp pixel art: nearest filtering, no mipmaps */
  nearest?: boolean;
  /** Colour data (sRGB). False for normal/roughness/alpha data */
  color?: boolean;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function finishTexture(texture: THREE.Texture, options: CanvasTextureOptions): THREE.Texture {
  const { repeat, nearest = false, color = true } = options;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  if (nearest) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  } else {
    texture.anisotropy = 4;
  }
  texture.needsUpdate = true;
  return texture;
}

/** Paints a canvas once and wraps it in a texture (empty texture during SSR). */
export function paintTexture(
  width: number,
  height: number,
  paint: Painter,
  options: CanvasTextureOptions = {},
): THREE.Texture {
  const canvas = createCanvas(width, height);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return new THREE.Texture();
  paint(ctx, width, height);
  return finishTexture(new THREE.CanvasTexture(canvas), options);
}

/**
 * Paints a greyscale height field (white = raised) and converts it to a
 * tangent-space normal map with a Sobel filter. Wraps at the edges so tiled
 * maps stay seamless.
 */
export function paintNormalTexture(
  width: number,
  height: number,
  paintHeight: Painter,
  strength: number,
  options: Omit<CanvasTextureOptions, 'color'> = {},
): THREE.Texture {
  const canvas = createCanvas(width, height);
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx) return new THREE.Texture();
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);
  paintHeight(ctx, width, height);
  const source = ctx.getImageData(0, 0, width, height).data;
  const output = ctx.createImageData(width, height);
  const heightAt = (x: number, y: number) =>
    source[(((y + height) % height) * width + ((x + width) % width)) * 4] / 255;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = heightAt(x + 1, y) - heightAt(x - 1, y);
      const dy = heightAt(x, y + 1) - heightAt(x, y - 1);
      const nx = -dx * strength;
      const ny = dy * strength;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * width + x) * 4;
      output.data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      output.data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      output.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      output.data[i + 3] = 255;
    }
  }
  ctx.putImageData(output, 0, 0);
  return finishTexture(new THREE.CanvasTexture(canvas), { ...options, color: false });
}

/** Fills the canvas with per-pixel brightness noise around a base grey. */
export function fillNoise(ctx: CanvasRenderingContext2D, rand: () => number, base: number, spread: number): void {
  const image = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.max(0, Math.min(255, base + (rand() - 0.5) * spread));
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Runs `draw` at the 9 tile offsets so shapes crossing an edge reappear on the opposite side.
 * Use it for anything drawn on a repeating texture, otherwise the clipped shapes show as seams.
 */
export function drawWrapped(ctx: CanvasRenderingContext2D, w: number, h: number, draw: () => void): void {
  for (const dx of [-w, 0, w]) {
    for (const dy of [-h, 0, h]) {
      ctx.save();
      ctx.translate(dx, dy);
      draw();
      ctx.restore();
    }
  }
}

/** Soft round blotch (radial gradient) - worn patches, moss clumps, puddles. */
export function blotch(
  ctx: CanvasRenderingContext2D,
  [x, y]: readonly [number, number],
  radius: number,
  color: string,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

/** Long wavy grain lines along the x axis (wood running around the rim). */
export function paintGrain(ctx: CanvasRenderingContext2D, rand: () => number, color: string, lines: number): void {
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = color;
  for (let i = 0; i < lines; i++) {
    const y0 = rand() * height;
    const amplitude = 1 + rand() * 3;
    const frequency = (2 + Math.floor(rand() * 4)) * ((Math.PI * 2) / width);
    ctx.globalAlpha = 0.15 + rand() * 0.35;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = y0 + Math.sin(x * frequency + i) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Converts a disc radius ratio (0 centre .. 1 felt edge) to canvas pixels. */
export function discPoint(size: number, radiusRatio: number, angle: number): [number, number] {
  const half = size / 2;
  return [half + Math.cos(angle) * radiusRatio * half, half + Math.sin(angle) * radiusRatio * half];
}
