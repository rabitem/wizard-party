import * as THREE from 'three';

/**
 * Paints a canvas once and wraps it in a texture. Returns an empty texture
 * during SSR so callers never need to guard.
 */
export function createPaintedTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Vertical gradient (top -> bottom) from colour stops in 0..1. */
export function fillVerticalGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stops: ReadonlyArray<readonly [number, string]>,
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
