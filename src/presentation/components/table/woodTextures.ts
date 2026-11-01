'use client';

import * as THREE from 'three';

/**
 * Enhanced wood grain texture with realistic details
 */
export function createEnhancedWoodTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Rich mahogany base
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#5c3317');
  gradient.addColorStop(0.3, '#6b3d1f');
  gradient.addColorStop(0.5, '#4a2511');
  gradient.addColorStop(0.7, '#5f3318');
  gradient.addColorStop(1, '#3d1f0d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Wood grain lines
  ctx.strokeStyle = 'rgba(30, 15, 5, 0.3)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 80; i++) {
    const y = (i / 80) * size;
    const wobble = Math.sin(i * 0.3) * 8;

    ctx.beginPath();
    ctx.moveTo(0, y + wobble);

    for (let x = 0; x < size; x += 10) {
      const yOffset = y + Math.sin(x * 0.02 + i * 0.5) * 4 + wobble;
      ctx.lineTo(x, yOffset);
    }
    ctx.stroke();
  }

  // Wood knots
  const knotPositions = [
    { x: size * 0.2, y: size * 0.3, r: 25 },
    { x: size * 0.7, y: size * 0.6, r: 18 },
    { x: size * 0.4, y: size * 0.8, r: 15 },
  ];

  knotPositions.forEach(({ x, y, r }) => {
    const knotGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    knotGrad.addColorStop(0, '#1a0a00');
    knotGrad.addColorStop(0.3, '#2d1508');
    knotGrad.addColorStop(0.7, '#3d1f0d');
    knotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = knotGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Knot rings
    for (let ring = 0; ring < 5; ring++) {
      ctx.strokeStyle = `rgba(20, 10, 0, ${0.3 - ring * 0.05})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3 + ring * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Lacquer shine highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(0, 0, size, size * 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * Generate a procedural wood grain normal map
 */
export function createWoodNormalMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Base neutral normal
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Wood grain - wavy horizontal lines
      const grainFreq = 0.15;
      const grainPhase = Math.sin(y * grainFreq + Math.sin(x * 0.02) * 3);
      const grainDetail = Math.sin(y * grainFreq * 4 + x * 0.05) * 0.3;

      // Knot simulation (occasional circular patterns)
      const knotX = (x - size * 0.3) / size;
      const knotY = (y - size * 0.6) / size;
      const knotDist = Math.sqrt(knotX * knotX + knotY * knotY);
      const knotEffect = knotDist < 0.1 ? Math.sin(knotDist * 50) * (0.1 - knotDist) * 10 : 0;

      // Combine effects
      let nx = 128 + (grainPhase + grainDetail) * 12 + knotEffect * 15;
      let ny = 128 + Math.sin(x * 0.1 + y * 0.02) * 5 + knotEffect * 10;

      // Micro detail
      nx += Math.sin(x * 3.7 + y * 2.3) * 2;
      ny += Math.cos(x * 2.1 + y * 4.7) * 2;

      data[i] = Math.max(0, Math.min(255, nx));
      data[i + 1] = Math.max(0, Math.min(255, ny));
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  return texture;
}
