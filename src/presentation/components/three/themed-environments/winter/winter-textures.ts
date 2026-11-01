import * as THREE from 'three';
import { WINTER_MELT } from '@/presentation/config/winter-porch.config';
import { createPaintedTexture, seededRandom } from '../primitives';

/** Boot print proportions in texture units (the decal is ~7 world units square) */
const BOOT = { LENGTH: 0.11, WIDTH: 0.021, HEEL: 0.03, GAIT: 0.026 } as const;

interface MeltBlob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
}

interface BootPrint {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

function blob(ctx: CanvasRenderingContext2D, { x, y, rx, ry, alpha }: MeltBlob): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, rx);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(0.65, `rgba(255,255,255,${alpha * 0.8})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One boot print (sole + heel), pointing along `angle`, in canvas units of the texture size. */
function bootPrint(ctx: CanvasRenderingContext2D, size: number, { x, y, angle, alpha }: BootPrint): void {
  ctx.save();
  ctx.translate(x * size, y * size);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, -BOOT.LENGTH * 0.18 * size, BOOT.WIDTH * size, BOOT.LENGTH * 0.5 * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, BOOT.LENGTH * 0.52 * size, BOOT.WIDTH * 0.85 * size, BOOT.HEEL * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Alpha mask for meltwater on the floor inside the archway: puddles and
 * droplets by the threshold (canvas top = towards the door) and a trail of
 * wet boot prints that dries out as it walks into the room.
 */
export function createMeltTexture(): THREE.Texture {
  const size = WINTER_MELT.TEXTURE_SIZE;
  const texture = createPaintedTexture(size, size, (ctx, w, h) => {
    const rand = seededRandom(91);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    // Melt puddles hugging the threshold, plus scattered drips.
    for (let i = 0; i < 9; i++) {
      blob(ctx, { x: w * (0.12 + rand() * 0.76), y: h * (0.02 + rand() * 0.16), rx: w * (0.05 + rand() * 0.09), ry: h * (0.025 + rand() * 0.04), alpha: 0.55 + rand() * 0.35 });
    }
    for (let i = 0; i < 46; i++) {
      blob(ctx, { x: w * rand(), y: h * (0.05 + rand() * 0.45), rx: w * (0.004 + rand() * 0.01), ry: h * (0.004 + rand() * 0.01), alpha: 0.5 + rand() * 0.4 });
    }
    // Footprints curving from the door towards the tree side.
    const pairs = WINTER_MELT.FOOTPRINT_PAIRS;
    for (let i = 0; i < pairs * 2; i++) {
      const t = i / (pairs * 2);
      const along = 0.1 + t * 0.85;
      const curve = Math.sin(t * 1.6) * 0.18;
      const side = i % 2 === 0 ? -1 : 1;
      const heading = Math.atan2(Math.cos(t * 1.6) * 0.29, 1);
      const x = 0.42 + curve + side * BOOT.GAIT * Math.cos(heading);
      const dryness = 1 - t * 0.85;
      bootPrint(ctx, w, { x, y: along, angle: Math.PI - heading, alpha: 0.75 * dryness });
    }
  });
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
