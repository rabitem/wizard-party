import * as THREE from 'three';
import { AUTUMN_COLORS } from '@/presentation/config/autumn-environment.config';
import { createPaintedTexture, seededRandom } from '../primitives';

const STRAW = { SIZE: 256, STRANDS: 1400, MIN_LENGTH: 14, MAX_LENGTH: 46, WRAP_MARGIN: 48 } as const;

/**
 * Tileable straw texture for hay bales: thousands of short strands in light
 * and dark golds over a dark base, mostly running one way. Strands that
 * cross an edge are drawn again on the opposite side so the tile wraps.
 */
export function createStrawTexture(): THREE.Texture {
  const texture = createPaintedTexture(STRAW.SIZE, STRAW.SIZE, (ctx, w, h) => {
    const rand = seededRandom(67);
    const palette = [AUTUMN_COLORS.hayDark, AUTUMN_COLORS.hay, AUTUMN_COLORS.hay, AUTUMN_COLORS.hayLight];
    ctx.fillStyle = AUTUMN_COLORS.hayDark;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (let i = 0; i < STRAW.STRANDS; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const angle = (rand() - 0.5) * 0.9 + (rand() > 0.85 ? Math.PI / 2 : 0);
      const length = STRAW.MIN_LENGTH + rand() * (STRAW.MAX_LENGTH - STRAW.MIN_LENGTH);
      const dx = Math.cos(angle) * length;
      const dy = Math.sin(angle) * length;
      ctx.strokeStyle = palette[Math.floor(rand() * palette.length)];
      ctx.globalAlpha = 0.55 + rand() * 0.45;
      ctx.lineWidth = 0.8 + rand() * 1.6;
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          const sx = x + ox;
          const sy = y + oy;
          if (sx < -STRAW.WRAP_MARGIN || sx > w + STRAW.WRAP_MARGIN || sy < -STRAW.WRAP_MARGIN || sy > h + STRAW.WRAP_MARGIN) continue;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + dx, sy + dy);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
