import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createDriftRingGeometry } from '../surface-geometry';
import {
  blotch,
  discPoint,
  drawWrapped,
  fillNoise,
  paintGrain,
  paintNormalTexture,
  paintTexture,
  seededRandom,
} from '../surface-textures';

const ICE_REPEAT: [number, number] = [2, 2];

/** Thin meandering ice cracks (same layout for colour and height maps), wrapped so the tile is seamless. */
function strokeIceCracks(ctx: CanvasRenderingContext2D, size: number) {
  drawWrapped(ctx, size, size, () => strokeIceCrackPaths(ctx, size));
}

function strokeIceCrackPaths(ctx: CanvasRenderingContext2D, size: number) {
  const rand = seededRandom(71);
  for (let c = 0; c < 14; c++) {
    let x = rand() * size;
    let y = rand() * size;
    let angle = rand() * Math.PI * 2;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 10; s++) {
      angle += (rand() - 0.5) * 1.1;
      x += Math.cos(angle) * (8 + rand() * 16);
      y += Math.sin(angle) * (8 + rand() * 16);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function paintIce() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      const rand = seededRandom(13);
      fillNoise(ctx, rand, 236, 16);
      const white = Array.from({ length: 12 }, () => [[rand() * w, rand() * h], 40 + rand() * 100] as const);
      const blue = Array.from({ length: 8 }, () => [[rand() * w, rand() * h], 40 + rand() * 80] as const);
      drawWrapped(ctx, w, h, () => {
        white.forEach(([at, r]) => blotch(ctx, at, r, '#ffffff', 0.35));
        blue.forEach(([at, r]) => blotch(ctx, at, r, '#8fbfe0', 0.3));
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      strokeIceCracks(ctx, w);
    },
    { repeat: ICE_REPEAT },
  );
}

function paintIceRoughness() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      const rand = seededRandom(14);
      fillNoise(ctx, rand, 70, 30);
      const spots = Array.from({ length: 12 }, () => [[rand() * w, rand() * h], 40 + rand() * 100] as const);
      drawWrapped(ctx, w, h, () => spots.forEach(([at, r]) => blotch(ctx, at, r, '#e0e0e0', 0.45)));
    },
    { repeat: ICE_REPEAT, color: false },
  );
}

function paintIceNormal() {
  return paintNormalTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w) => {
      ctx.strokeStyle = '#303030';
      strokeIceCracks(ctx, w);
    },
    2.2,
    { repeat: ICE_REPEAT },
  );
}

function strokeDendrite(
  ctx: CanvasRenderingContext2D,
  [x, y]: readonly [number, number],
  angle: number,
  length: number,
  depth: number,
) {
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  if (depth === 0) return;
  [0.35, 0.7].forEach((along) => {
    const bx = x + Math.cos(angle) * length * along;
    const by = y + Math.sin(angle) * length * along;
    strokeDendrite(ctx, [bx, by], angle + Math.PI / 3, length * 0.45, depth - 1);
    strokeDendrite(ctx, [bx, by], angle - Math.PI / 3, length * 0.45, depth - 1);
  });
}

/** Frost crystals creeping in from the edge with a soft white rime. */
function paintFrostDecal() {
  return paintTexture(SIZE.DECAL, SIZE.DECAL, (ctx, size) => {
    const half = size / 2;
    const rime = ctx.createRadialGradient(half, half, half * 0.82, half, half, half);
    rime.addColorStop(0, 'rgba(255,255,255,0)');
    rime.addColorStop(1, 'rgba(240,250,255,0.55)');
    ctx.fillStyle = rime;
    ctx.fillRect(0, 0, size, size);
    const rand = seededRandom(37);
    ctx.strokeStyle = 'rgba(245,252,255,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2 + rand() * 0.05;
      const [x, y] = discPoint(size, 0.995, angle);
      strokeDendrite(ctx, [x, y], angle + Math.PI + (rand() - 0.5) * 0.5, 20 + rand() * 40, 2);
    }
    ctx.stroke();
  });
}

/** Wood rim with frost speckles and rime along both edges. */
function paintFrostedRim(palette: TableThemePalette) {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.base;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(31);
      paintGrain(ctx, rand, palette.wood.molding, 30);
      const rime = ctx.createLinearGradient(0, 0, 0, h);
      rime.addColorStop(0, 'rgba(235,245,255,0.6)');
      rime.addColorStop(0.25, 'rgba(235,245,255,0.05)');
      rime.addColorStop(0.75, 'rgba(235,245,255,0.05)');
      rime.addColorStop(1, 'rgba(235,245,255,0.7)');
      ctx.fillStyle = rime;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(240,248,255,0.5)';
      for (let i = 0; i < 600; i++) ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    },
    { repeat: [8, 1] },
  );
}

/** Snow drifts: against the inner molding, against the armrest and on top of the armrest. */
function createDrifts() {
  return {
    innerDrift: createDriftRingGeometry({ radius: 2.95, width: 0.1, height: 0.06, baseY: -0.016, seed: 3 }),
    outerDrift: createDriftRingGeometry({ radius: 3.28, width: 0.12, height: 0.075, baseY: -0.016, seed: 9 }),
    armrestDrift: createDriftRingGeometry({ radius: 3.5, width: 0.2, height: 0.06, baseY: 0.195, seed: 15 }),
  };
}

/** Frosted glowing ice, frost-crystal edge, frosted rim and soft snow for the Frozen Hall. */
export function createWinterAssets(palette: TableThemePalette) {
  const iceMap = paintIce();
  const iceRoughness = paintIceRoughness();
  const iceNormal = paintIceNormal();
  const frostMap = paintFrostDecal();
  const rimMap = paintFrostedRim(palette);
  const base = new THREE.MeshPhysicalMaterial({
    map: iceMap,
    color: '#bcdcee',
    roughnessMap: iceRoughness,
    roughness: 1,
    normalMap: iceNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    emissive: new THREE.Color('#4f9fd6'),
    emissiveMap: iceMap,
    emissiveIntensity: 0.16,
  });
  const edge = base.clone();
  edge.color.set('#9cc4dc');
  const center = base.clone();
  center.color.set('#d6eef9');
  return {
    iceMap,
    iceRoughness,
    iceNormal,
    frostMap,
    rimMap,
    base,
    edge,
    center,
    decal: asOverlay(
      new THREE.MeshStandardMaterial({
        map: frostMap,
        emissive: new THREE.Color('#e8f6ff'),
        emissiveMap: frostMap,
        emissiveIntensity: 0.25,
        roughness: 0.6,
      }),
      true,
    ),
    rim: asOverlay(new THREE.MeshStandardMaterial({ map: rimMap, roughness: 0.6 })),
    snow: new THREE.MeshStandardMaterial({
      color: '#f3f8fc',
      roughness: 0.95,
      emissive: new THREE.Color('#a9cbe6'),
      emissiveIntensity: 0.08,
    }),
    ...createDrifts(),
    ...createAccentRings(palette),
  };
}
