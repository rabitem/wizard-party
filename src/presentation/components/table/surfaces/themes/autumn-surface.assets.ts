import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_LAYER_Y, SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createLeafGeometry, OAK_LEAF, traceLeaf } from '../leaf-shapes';
import { fillNoise, paintGrain, paintNormalTexture, paintTexture, seededRandom } from '../surface-textures';

const FELT_REPEAT: [number, number] = [3, 3];
const RIM_REPEAT = 8;

/** Calls draw for every embossed oak leaf (and its wrap-around copies, so the tile is seamless). */
function forEachOak(size: number, draw: (x: number, y: number, leafSize: number, rotation: number) => void) {
  const rand = seededRandom(43);
  const cells = 3;
  const cell = size / cells;
  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      const x = (gx + 0.5) * cell + (rand() - 0.5) * cell * 0.4;
      const y = (gy + 0.5) * cell + (rand() - 0.5) * cell * 0.4;
      const leafSize = cell * (0.55 + rand() * 0.25);
      const rotation = rand() * Math.PI * 2;
      [-size, 0, size].forEach((ox) => [-size, 0, size].forEach((oy) => draw(x + ox, y + oy, leafSize, rotation)));
    }
  }
}

function strokeMidrib(ctx: CanvasRenderingContext2D, x: number, y: number, leafSize: number, rotation: number) {
  const dx = -Math.sin(rotation) * leafSize * 0.5;
  const dy = Math.cos(rotation) * leafSize * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - dx * 1.1, y - dy * 1.1);
  ctx.lineTo(x + dx * 0.9, y + dy * 0.9);
  ctx.stroke();
}

function paintFelt() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      fillNoise(ctx, seededRandom(3), 228, 30);
      ctx.strokeStyle = 'rgba(60,24,6,0.18)';
      ctx.lineWidth = 2;
      forEachOak(w, (x, y, s, r) => {
        traceLeaf(ctx, OAK_LEAF, [x, y], s, r);
        ctx.fillStyle = 'rgba(70,30,8,0.1)';
        ctx.fill();
        strokeMidrib(ctx, x, y, s, r);
      });
    },
    { repeat: FELT_REPEAT },
  );
}

function paintFeltNormal() {
  return paintNormalTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w) => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6a6a6a';
      forEachOak(w, (x, y, s, r) => {
        traceLeaf(ctx, OAK_LEAF, [x, y], s, r);
        ctx.fillStyle = '#a8a8a8';
        ctx.fill();
        strokeMidrib(ctx, x, y, s, r);
      });
    },
    2.4,
    { repeat: FELT_REPEAT },
  );
}

function paintRim(palette: TableThemePalette) {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = palette.wood.base;
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(23);
      paintGrain(ctx, rand, palette.wood.molding, 34);
      paintGrain(ctx, rand, '#c98a4a', 18);
    },
    { repeat: [RIM_REPEAT, 1] },
  );
}

const DRY_LEAF_COLORS = ['#b5541c', '#d98a2b', '#8a3b16', '#c46a1e', '#7a4a1e', '#e0a040'];
const DRY_LEAF_CLUSTERS = [0.6, 2.35, 3.9, 5.3];

/** A few dry oak leaves lying on the felt edge band (outside the play radius). */
function dryLeafMatrices(): THREE.Matrix4[] {
  const rand = seededRandom(97);
  const object = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  DRY_LEAF_CLUSTERS.forEach((clusterAngle) => {
    const count = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const angle = clusterAngle + (rand() - 0.5) * 0.12;
      const radius = 2.835 + rand() * 0.025;
      object.position.set(Math.cos(angle) * radius, SURFACE_LAYER_Y.EDGE_DECOR + i * 0.002, Math.sin(angle) * radius);
      // Lie roughly tangential so the leaf stays inside the edge band
      object.rotation.set((rand() - 0.5) * 0.15, -angle + (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.15);
      object.scale.setScalar(0.1 + rand() * 0.04);
      object.updateMatrix();
      matrices.push(object.matrix.clone());
    }
  });
  return matrices;
}

export const AUTUMN_DRY_LEAVES = { matrices: dryLeafMatrices(), colors: DRY_LEAF_COLORS } as const;

/** Oak-leaf embossed russet felt, warm polished rim and dry leaves for the Autumn Harvest table. */
export function createAutumnAssets(palette: TableThemePalette) {
  const feltMap = paintFelt();
  const feltNormal = paintFeltNormal();
  const rimMap = paintRim(palette);
  const base = new THREE.MeshStandardMaterial({
    map: feltMap,
    normalMap: feltNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: palette.felt.base,
    roughness: 0.94,
  });
  const edge = base.clone();
  edge.color.set(palette.felt.edge);
  const center = base.clone();
  center.color.set(palette.felt.center);
  return {
    feltMap,
    feltNormal,
    rimMap,
    base,
    edge,
    center,
    rim: asOverlay(
      new THREE.MeshPhysicalMaterial({ map: rimMap, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12 }),
    ),
    cap: new THREE.MeshPhysicalMaterial({ color: palette.wood.molding, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    leafGeometry: createLeafGeometry(OAK_LEAF, 0.18),
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide }),
    ...createAccentRings(palette),
  };
}
