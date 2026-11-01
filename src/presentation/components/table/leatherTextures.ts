'use client';

import * as THREE from 'three';

/**
 * Create leather texture for armrest
 */
export function createLeatherTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Deep burgundy leather base
  ctx.fillStyle = '#2a1215';
  ctx.fillRect(0, 0, size, size);

  // Leather grain pattern
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Irregular leather texture
      const noise1 = Math.sin(x * 0.3 + y * 0.2) * Math.cos(x * 0.15 - y * 0.25);
      const noise2 = Math.sin(x * 0.8 + y * 0.9) * 0.3;
      const noise3 = Math.cos(x * 0.05 + y * 0.07) * 0.2;

      const variation = (noise1 + noise2 + noise3) * 15;

      data[i] = Math.max(0, Math.min(255, 42 + variation));     // R
      data[i + 1] = Math.max(0, Math.min(255, 18 + variation * 0.5)); // G
      data[i + 2] = Math.max(0, Math.min(255, 21 + variation * 0.5)); // B
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 2);
  return texture;
}

/**
 * Create leather normal map
 */
export function createLeatherNormalMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Bumpy leather texture
      const bump1 = Math.sin(x * 0.4) * Math.cos(y * 0.35) * 20;
      const bump2 = Math.sin(x * 0.9 + y * 0.7) * 8;
      const bump3 = Math.cos(x * 0.2 - y * 0.3) * 5;

      data[i] = Math.max(0, Math.min(255, 128 + bump1 + bump2));
      data[i + 1] = Math.max(0, Math.min(255, 128 + bump3 + bump2 * 0.5));
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 2);
  return texture;
}
