import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createRadialRingGeometry } from '../surface-geometry';
import { blotch, fillNoise, paintGrain, paintTexture, seededRandom } from '../surface-textures';

export const ZODIAC_RING = { INNER: 2.3, OUTER: 2.5 } as const;
const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
/** Text presentation selector so the signs never render as colour emoji. */
const TEXT_STYLE = '︎';
const SYMBOL_FONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols", "Noto Sans Symbols 2", serif';
const GOLD = '#e6c46a';

function paintNap() {
  return paintTexture(SIZE.TILE, SIZE.TILE, (ctx, w, h) => fillNoise(ctx, seededRandom(21), 226, 28), {
    repeat: [3, 3],
  });
}

/** Scattered stars (white on black) for the velvet's emissive map. */
function paintStars() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(33);
      for (let i = 0; i < 170; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 0.4 + rand() * 1.1;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (rand() < 0.08) {
          ctx.fillRect(x - 5, y - 0.5, 10, 1);
          ctx.fillRect(x - 0.5, y - 5, 1, 10);
        }
      }
    },
    { repeat: [2, 2] },
  );
}

function drawConstellation(ctx: CanvasRenderingContext2D, size: number, rand: () => number) {
  const half = size / 2;
  const angle = rand() * Math.PI * 2;
  const radius = (0.25 + rand() * 0.6) * half;
  let x = half + Math.cos(angle) * radius;
  let y = half + Math.sin(angle) * radius;
  const stars: [number, number][] = [[x, y]];
  let heading = rand() * Math.PI * 2;
  const count = 4 + Math.floor(rand() * 4);
  for (let i = 1; i < count; i++) {
    heading += (rand() - 0.5) * 1.8;
    x += Math.cos(heading) * (30 + rand() * 45);
    y += Math.sin(heading) * (30 + rand() * 45);
    stars.push([x, y]);
  }
  ctx.strokeStyle = 'rgba(230,200,130,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  stars.forEach(([sx, sy], i) => (i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
  ctx.stroke();
  stars.forEach(([sx, sy]) => {
    blotch(ctx, [sx, sy], 10, 'rgba(255,236,180,0.9)', 0.6);
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + rand() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintConstellations() {
  return paintTexture(SIZE.DECAL, SIZE.DECAL, (ctx, size) => {
    const rand = seededRandom(77);
    for (let i = 0; i < 9; i++) drawConstellation(ctx, size, rand);
  });
}

/** Gold band with engraved borders, the twelve signs and diamond dividers. */
function paintZodiacBand() {
  const width = SIZE.STRIP_WIDTH * 2;
  const height = SIZE.STRIP_HEIGHT;
  return paintTexture(width, height, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f6dc8e');
    gradient.addColorStop(0.5, GOLD);
    gradient.addColorStop(1, '#a88232');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#6e5016';
    ctx.fillRect(0, 10, width, 3);
    ctx.fillRect(0, height - 13, width, 3);
    const step = width / ZODIAC_SIGNS.length;
    ctx.font = `${Math.round(height * 0.5)}px ${SYMBOL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ZODIAC_SIGNS.forEach((sign, i) => {
      const x = (i + 0.5) * step;
      ctx.fillStyle = 'rgba(255,240,200,0.6)';
      ctx.fillText(sign + TEXT_STYLE, x + 1.5, height / 2 + 1.5);
      ctx.fillStyle = '#5a400f';
      ctx.fillText(sign + TEXT_STYLE, x, height / 2);
      const dx = (i + 1) * step;
      ctx.beginPath();
      ctx.moveTo(dx, height / 2 - 9);
      ctx.lineTo(dx + 6, height / 2);
      ctx.lineTo(dx, height / 2 + 9);
      ctx.lineTo(dx - 6, height / 2);
      ctx.closePath();
      ctx.fill();
    });
  });
}

function paintNightRim(palette: TableThemePalette) {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.base;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(45);
      paintGrain(ctx, rand, '#2a2858', 26);
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = `rgba(230,196,106,${0.3 + rand() * 0.6})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
      }
    },
    { repeat: [6, 1] },
  );
}

/** Midnight velvet with stars + constellations, a gold zodiac inlay and a starry rim for the Star Chamber. */
export function createCelestialAssets(palette: TableThemePalette) {
  const napMap = paintNap();
  const starMap = paintStars();
  const constellationMap = paintConstellations();
  const zodiacMap = paintZodiacBand();
  const rimMap = paintNightRim(palette);
  const base = new THREE.MeshPhysicalMaterial({
    map: napMap,
    color: palette.felt.base,
    roughness: 0.9,
    sheen: 1,
    sheenColor: new THREE.Color('#6f7cff'),
    sheenRoughness: 0.4,
    emissive: new THREE.Color('#dfe6ff'),
    emissiveMap: starMap,
    emissiveIntensity: 0.7,
  });
  const edge = base.clone();
  edge.color.set(palette.felt.edge);
  const center = base.clone();
  center.color.set(palette.felt.center);
  return {
    napMap,
    starMap,
    constellationMap,
    zodiacMap,
    rimMap,
    base,
    edge,
    center,
    decal: asOverlay(new THREE.MeshBasicMaterial({ map: constellationMap, opacity: 0.8 }), true),
    zodiac: asOverlay(new THREE.MeshStandardMaterial({ map: zodiacMap, metalness: 0.85, roughness: 0.32 })),
    zodiacGeometry: createRadialRingGeometry(ZODIAC_RING.INNER, ZODIAC_RING.OUTER),
    rim: asOverlay(new THREE.MeshPhysicalMaterial({ map: rimMap, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 })),
    goldCap: new THREE.MeshStandardMaterial({ color: palette.accent.outerRing, metalness: 0.9, roughness: 0.25 }),
    darkCap: new THREE.MeshPhysicalMaterial({ color: palette.wood.molding, roughness: 0.25, clearcoat: 1 }),
    ...createAccentRings(palette),
  };
}
