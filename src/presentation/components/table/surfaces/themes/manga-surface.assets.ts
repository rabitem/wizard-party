import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { fillNoise, paintTexture, seededRandom } from '../surface-textures';

const SCREENTONE = { SPACING: 9, MAX_DOT: 3.3, START: 0.5 } as const;
const ENSO = { RADIUS: 0.93, WIDTH: 0.022, GAP: 0.35, STEPS: 220 } as const;

/** Off-white paper with faint fibres. */
function paintPaper() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      const rand = seededRandom(11);
      fillNoise(ctx, rand, 246, 10);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 500; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const a = rand() * Math.PI * 2;
        const l = 4 + rand() * 10;
        ctx.strokeStyle = `rgba(90,80,60,${0.04 + rand() * 0.06})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    },
    { repeat: [2, 2] },
  );
}

/** Halftone dots that grow toward the edge (classic manga screentone gradient). */
function paintScreentone(ctx: CanvasRenderingContext2D, size: number) {
  const half = size / 2;
  ctx.fillStyle = 'rgba(20,20,20,0.5)';
  for (let row = 0, y = 0; y < size; row++, y += SCREENTONE.SPACING) {
    const shift = row % 2 === 0 ? 0 : SCREENTONE.SPACING / 2;
    for (let x = shift; x < size; x += SCREENTONE.SPACING) {
      const rr = Math.hypot(x - half, y - half) / half;
      if (rr > 1 || rr < SCREENTONE.START) continue;
      const dot = ((rr - SCREENTONE.START) / (1 - SCREENTONE.START)) * SCREENTONE.MAX_DOT;
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Single sweeping ensō brush stroke with a dry-brush taper and an open gap. */
function paintEnso(ctx: CanvasRenderingContext2D, size: number) {
  const half = size / 2;
  const rand = seededRandom(5);
  const span = Math.PI * 2 - ENSO.GAP;
  const start = -Math.PI / 2 + 0.4;
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let i = 0; i <= ENSO.STEPS; i++) {
    const t = i / ENSO.STEPS;
    const a = start + t * span;
    const width = ENSO.WIDTH * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.75 + rand() * 0.25) + 0.002;
    const r = ENSO.RADIUS + Math.sin(t * 9) * 0.004;
    outer.push([half + Math.cos(a) * (r + width) * half, half + Math.sin(a) * (r + width) * half]);
    inner.push([half + Math.cos(a) * (r - width) * half, half + Math.sin(a) * (r - width) * half]);
  }
  ctx.fillStyle = 'rgba(14,14,14,0.9)';
  ctx.beginPath();
  [...outer, ...inner.reverse()].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function paintDecal() {
  return paintTexture(SIZE.DECAL, SIZE.DECAL, (ctx, size) => {
    paintScreentone(ctx, size);
    paintEnso(ctx, size);
  });
}

/** Black lacquer strip with a red pinstripe by the play edge and faint brush sweeps. */
function paintLacquerRim(palette: TableThemePalette) {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.base;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(2);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.015 + rand() * 0.02})`;
        ctx.fillRect(rand() * w, rand() * h, 60 + rand() * 200, 2 + rand() * 5);
      }
      ctx.fillStyle = palette.accent.innerRing;
      ctx.fillRect(0, h * 0.86, w, 3);
    },
    { repeat: [4, 1] },
  );
}

/** Off-white paper felt with screentone + ensō and an ink-black lacquer rim for the Ink Dojo. */
export function createMangaAssets(palette: TableThemePalette) {
  const paperMap = paintPaper();
  const decalMap = paintDecal();
  const rimMap = paintLacquerRim(palette);
  const base = new THREE.MeshStandardMaterial({ map: paperMap, color: palette.felt.base, roughness: 0.97 });
  const edge = base.clone();
  edge.color.set(palette.felt.edge);
  const center = base.clone();
  center.color.set(palette.felt.center);
  const lacquer = { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04 };
  const { innerRing } = createAccentRings(palette);
  return {
    paperMap,
    decalMap,
    rimMap,
    base,
    edge,
    center,
    innerRing,
    decal: asOverlay(new THREE.MeshBasicMaterial({ map: decalMap }), true),
    rim: asOverlay(new THREE.MeshPhysicalMaterial({ map: rimMap, ...lacquer })),
    cap: new THREE.MeshPhysicalMaterial({ color: palette.wood.molding, ...lacquer }),
  };
}
