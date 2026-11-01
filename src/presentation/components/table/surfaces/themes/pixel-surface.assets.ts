import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay } from '../LayeredSurface';
import { SURFACE_LAYOUT } from '../surface.config';
import { paintTexture, seededRandom } from '../surface-textures';

const FELT_PIXELS = 64;
const PIXEL_RING_SEGMENTS = 16;

/** Blocky battlements: inner row hides the brass trim + molding, outer row the outer molding. */
export const PIXEL_BLOCK_ROWS = [
  { radius: 2.92, depth: 0.1, count: 112, heights: [0.055, 0.075], questionEvery: 14 },
  { radius: 3.32, depth: 0.08, count: 132, heights: [0.06, 0.045], questionEvery: 0 },
] as const;

function paintPixelFelt(palette: TableThemePalette) {
  return paintTexture(
    FELT_PIXELS,
    FELT_PIXELS,
    (ctx, w, h) => {
      const rand = seededRandom(9);
      const tones = [palette.felt.base, palette.felt.base, palette.felt.edge, palette.felt.center];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // Pixel tufts and tiny flowers
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(rand() * (w - 3));
        const y = Math.floor(rand() * (h - 3));
        if (i % 3 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 1, y, 1, 1);
          ctx.fillRect(x, y + 1, 1, 1);
          ctx.fillRect(x + 2, y + 1, 1, 1);
          ctx.fillRect(x + 1, y + 2, 1, 1);
          ctx.fillStyle = palette.accent.innerRing;
          ctx.fillRect(x + 1, y + 1, 1, 1);
        } else {
          ctx.fillStyle = palette.felt.stitch;
          ctx.fillRect(x, y + 1, 1, 2);
          ctx.fillRect(x + 2, y + 1, 1, 2);
          ctx.fillRect(x + 1, y, 1, 3);
        }
      }
    },
    { repeat: [5, 5], nearest: true },
  );
}

/** Pixel bricks (wood palette) running around the rim. */
function paintBricks(palette: TableThemePalette) {
  return paintTexture(
    32,
    8,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.molding;
      ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 2; row++) {
        const offset = row === 0 ? 0 : 4;
        for (let x = -offset; x < w; x += 8) {
          ctx.fillStyle = palette.wood.base;
          ctx.fillRect(x, row * 4, 7, 3);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(x, row * 4, 7, 1);
        }
      }
    },
    { repeat: [48, 1], nearest: true },
  );
}

/** Block transforms + colours (every Nth inner block is a golden "?" block). */
export function createPixelBlockLayout(palette: TableThemePalette) {
  const object = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  const colors: string[] = [];
  PIXEL_BLOCK_ROWS.forEach((row) => {
    const width = ((Math.PI * 2 * row.radius) / row.count) * 0.9;
    for (let i = 0; i < row.count; i++) {
      const angle = (i / row.count) * Math.PI * 2;
      const height = row.heights[i % 2];
      object.position.set(Math.cos(angle) * row.radius, -0.02 + height / 2, Math.sin(angle) * row.radius);
      object.rotation.set(0, -angle - Math.PI / 2, 0);
      object.scale.set(width, height, row.depth);
      object.updateMatrix();
      matrices.push(object.matrix.clone());
      const isQuestion = row.questionEvery > 0 && i % row.questionEvery === 0;
      colors.push(isQuestion ? palette.accent.innerRing : [palette.wood.base, palette.wood.molding][i % 2]);
    }
  });
  return { matrices, colors };
}

/** Pixel-pattern felt (nearest filtering), brick rim and chunky blocks for the Pixel Arcade. */
export function createPixelAssets(palette: TableThemePalette) {
  const feltMap = paintPixelFelt(palette);
  const brickMap = paintBricks(palette);
  const base = new THREE.MeshStandardMaterial({ map: feltMap, roughness: 0.9 });
  const edge = base.clone();
  edge.color.set('#b0b0b0');
  const ring = (color: string) =>
    asOverlay(new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true }));
  const L = SURFACE_LAYOUT;
  return {
    feltMap,
    brickMap,
    base,
    edge,
    innerRing: ring(palette.accent.innerRing),
    outerRing: ring(palette.accent.outerRing),
    innerRingGeometry: new THREE.RingGeometry(L.INNER_RING[0], L.INNER_RING[1], PIXEL_RING_SEGMENTS),
    outerRingGeometry: new THREE.RingGeometry(L.OUTER_RING[0], L.OUTER_RING[1], PIXEL_RING_SEGMENTS * 2),
    centerGeometry: new THREE.CircleGeometry(L.CENTER_RADIUS, 8),
    center: ring(palette.felt.center),
    rim: asOverlay(new THREE.MeshStandardMaterial({ map: brickMap, roughness: 0.85 })),
    blockGeometry: new THREE.BoxGeometry(1, 1, 1),
    block: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, flatShading: true }),
  };
}
