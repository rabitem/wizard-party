import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import {
  blotch,
  discPoint,
  fillNoise,
  paintGrain,
  paintNormalTexture,
  paintTexture,
  seededRandom,
} from '../surface-textures';

const RIM_REPEAT = 6;
const STRIP = { w: SIZE.STRIP_WIDTH, h: SIZE.STRIP_HEIGHT } as const;

/** Elder-futhark-like rune strokes in a unit box (x1, y1, x2, y2). */
const RUNES: ReadonlyArray<ReadonlyArray<readonly [number, number, number, number]>> = [
  [[0.3, 0, 0.3, 1], [0.3, 0.15, 0.75, 0.35], [0.3, 0.45, 0.75, 0.65]],
  [[0.5, 0, 0.5, 1], [0.15, 0.25, 0.85, 0.6]],
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.3], [0.75, 0.3, 0.3, 0.55]],
  [[0.5, 0, 0.5, 1], [0.5, 0.35, 0.15, 0], [0.5, 0.35, 0.85, 0]],
  [[0.2, 0, 0.2, 1], [0.8, 0, 0.8, 1], [0.2, 0.2, 0.8, 0.55]],
  [[0.5, 0, 0.15, 0.5], [0.15, 0.5, 0.5, 1], [0.5, 0, 0.85, 0.5], [0.85, 0.5, 0.5, 1]],
  [[0.25, 0, 0.75, 1], [0.75, 0, 0.25, 1]],
  [[0.5, 0, 0.5, 1], [0.5, 0.2, 0.85, 0.45], [0.5, 0.2, 0.15, 0.45]],
];

function strokeRune(ctx: CanvasRenderingContext2D, rune: (typeof RUNES)[number], x: number, y: number, size: number) {
  ctx.beginPath();
  rune.forEach(([x1, y1, x2, y2]) => {
    ctx.moveTo(x + x1 * size * 0.6, y + y1 * size);
    ctx.lineTo(x + x2 * size * 0.6, y + y2 * size);
  });
  ctx.stroke();
}

/** Calls draw for every rune slot so colour, height and glow maps line up. */
function forEachRune(draw: (rune: (typeof RUNES)[number], x: number, y: number, size: number) => void) {
  const rand = seededRandom(61);
  const count = 7;
  for (let i = 0; i < count; i++) {
    const rune = RUNES[Math.floor(rand() * RUNES.length)];
    draw(rune, (i + 0.3 + rand() * 0.4) * (STRIP.w / count), STRIP.h * 0.36, 30);
  }
}

/** Jagged cracks mostly following the grain, with short branches. */
function strokeCracks(ctx: CanvasRenderingContext2D) {
  const rand = seededRandom(83);
  for (let c = 0; c < 5; c++) {
    let x = rand() * STRIP.w;
    let y = 10 + rand() * (STRIP.h - 20);
    ctx.lineWidth = 1.4 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const length = 8 + Math.floor(rand() * 10);
    for (let s = 0; s < length; s++) {
      x += 8 + rand() * 14;
      y += (rand() - 0.5) * 9;
      ctx.lineTo(x, y);
      if (rand() < 0.2) {
        ctx.lineTo(x + 6 + rand() * 8, y + (rand() - 0.5) * 22);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function paintRim(palette: TableThemePalette) {
  return paintTexture(
    STRIP.w,
    STRIP.h,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.base;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(17);
      paintGrain(ctx, rand, palette.wood.apron, 40);
      paintGrain(ctx, rand, '#4a3f38', 14);
      ctx.strokeStyle = '#050403';
      strokeCracks(ctx);
      forEachRune((rune, x, y, size) => {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#090504';
        strokeRune(ctx, rune, x, y, size);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(120,100,84,0.55)';
        strokeRune(ctx, rune, x + 1.5, y + 1.5, size);
      });
    },
    { repeat: [RIM_REPEAT, 1] },
  );
}

function paintRimGlow() {
  return paintTexture(
    STRIP.w,
    STRIP.h,
    (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      forEachRune((rune, x, y, size) => strokeRune(ctx, rune, x, y, size));
    },
    { repeat: [RIM_REPEAT, 1] },
  );
}

function paintRimNormal() {
  return paintNormalTexture(
    STRIP.w,
    STRIP.h,
    (ctx) => {
      ctx.strokeStyle = '#000';
      strokeCracks(ctx);
      ctx.lineWidth = 3;
      forEachRune((rune, x, y, size) => strokeRune(ctx, rune, x, y, size));
    },
    3,
    { repeat: [RIM_REPEAT, 1] },
  );
}

/** Worn velvet nap: fine noise with lighter rubbed patches and darker pooling. */
function paintVelvet() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      const rand = seededRandom(5);
      fillNoise(ctx, rand, 222, 34);
      for (let i = 0; i < 9; i++) blotch(ctx, [rand() * w, rand() * h], 40 + rand() * 90, '#ffffff', 0.22);
      for (let i = 0; i < 7; i++) blotch(ctx, [rand() * w, rand() * h], 30 + rand() * 70, '#3a3040', 0.25);
    },
    { repeat: [3, 3] },
  );
}

function strokeCobweb(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rand: () => number) {
  const spokes = 9;
  const angles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + rand() * 0.3);
  ctx.beginPath();
  angles.forEach((a) => {
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  });
  for (let ring = 1; ring <= 6; ring++) {
    const r = (ring / 6) * radius;
    angles.forEach((a, i) => {
      const next = angles[(i + 1) % spokes];
      const mid = (a + next) / 2 + (i === spokes - 1 ? Math.PI : 0);
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.quadraticCurveTo(cx + Math.cos(mid) * r * 0.82, cy + Math.sin(mid) * r * 0.82, cx + Math.cos(next) * r, cy + Math.sin(next) * r);
    });
  }
  ctx.stroke();
}

function strokeWax(ctx: CanvasRenderingContext2D, [x, y]: readonly [number, number], radius: number, rand: () => number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = radius * (0.7 + rand() * 0.45);
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Faint cobwebs in three corners of the play area and wax drips by the edge. */
function paintDecal() {
  return paintTexture(SIZE.DECAL, SIZE.DECAL, (ctx, size) => {
    const rand = seededRandom(29);
    ctx.strokeStyle = 'rgba(232,222,255,0.2)';
    ctx.lineWidth = 1.3;
    [0.9, 2.6, 4.6].forEach((angle) => {
      const [cx, cy] = discPoint(size, 0.82, angle);
      strokeCobweb(ctx, cx, cy, 120 + rand() * 50, rand);
    });
    for (let i = 0; i < 9; i++) {
      const [x, y] = discPoint(size, 0.9 + rand() * 0.07, rand() * Math.PI * 2);
      const color = rand() < 0.6 ? 'rgba(236,224,196,0.85)' : 'rgba(255,150,60,0.8)';
      strokeWax(ctx, [x, y], 7 + rand() * 9, rand, color);
    }
  });
}

/** Velvet, cobweb decal, cracked rune rim and dark wood caps for the Haunted Manor. */
export function createHalloweenAssets(palette: TableThemePalette) {
  const velvet = paintVelvet();
  const decalMap = paintDecal();
  const rimMap = paintRim(palette);
  const rimNormal = paintRimNormal();
  const rimGlow = paintRimGlow();
  const base = new THREE.MeshPhysicalMaterial({
    map: velvet,
    color: palette.felt.base,
    roughness: 0.92,
    sheen: 1,
    sheenColor: new THREE.Color('#b892e0'),
    sheenRoughness: 0.45,
  });
  const edge = base.clone();
  edge.color.set(palette.felt.edge);
  const center = base.clone();
  center.color.set(palette.felt.center);
  return {
    velvet,
    decalMap,
    rimMap,
    rimNormal,
    rimGlow,
    base,
    edge,
    center,
    decal: asOverlay(new THREE.MeshStandardMaterial({ map: decalMap, roughness: 0.7 }), true),
    rim: asOverlay(
      new THREE.MeshStandardMaterial({
        map: rimMap,
        normalMap: rimNormal,
        emissiveMap: rimGlow,
        emissive: new THREE.Color('#ff6a12'),
        emissiveIntensity: 0.5,
        roughness: 0.78,
      }),
    ),
    cap: new THREE.MeshStandardMaterial({ color: palette.wood.molding, roughness: 0.65 }),
    ...createAccentRings(palette),
  };
}
