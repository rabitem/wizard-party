import * as THREE from 'three';
import { seededRandom } from './instancing';

const TEXTURE_SIZE = 256;

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

function finish(canvas: HTMLCanvasElement | null, repeat: [number, number]): THREE.Texture {
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shade(hex: string, amount: number): string {
  const color = new THREE.Color(hex);
  color.offsetHSL(0, 0, amount);
  return `#${color.getHexString()}`;
}

export interface PlankTextureOptions {
  planks: number;
  base: string;
  /** Lightness jitter per plank */
  variation?: number;
  seed?: number;
  repeat?: [number, number];
  /** Planks run vertically (walls) instead of horizontally (floors) */
  vertical?: boolean;
}

/** Wood planks with grain streaks, knots and dark seams. */
export function createPlankTexture({
  planks,
  base,
  variation = 0.05,
  seed = 3,
  repeat = [1, 1],
  vertical = false,
}: PlankTextureOptions): THREE.Texture {
  const surface = createCanvas();
  if (!surface) return finish(null, repeat);
  const { canvas, ctx } = surface;
  const rand = seededRandom(seed);
  const plankSize = TEXTURE_SIZE / planks;

  if (vertical) {
    ctx.translate(TEXTURE_SIZE, 0);
    ctx.rotate(Math.PI / 2);
  }
  for (let i = 0; i < planks; i++) {
    const y = i * plankSize;
    ctx.fillStyle = shade(base, (rand() - 0.5) * variation * 2);
    ctx.fillRect(0, y, TEXTURE_SIZE, plankSize);
    for (let g = 0; g < 7; g++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + rand() * 0.08})`;
      ctx.lineWidth = 1 + rand();
      const gy = y + rand() * plankSize;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(TEXTURE_SIZE * 0.3, gy + (rand() - 0.5) * 6, TEXTURE_SIZE * 0.7, gy + (rand() - 0.5) * 6, TEXTURE_SIZE, gy);
      ctx.stroke();
    }
    if (rand() > 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(rand() * TEXTURE_SIZE, y + plankSize / 2, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, y, TEXTURE_SIZE, 2);
  }
  return finish(canvas, repeat);
}
