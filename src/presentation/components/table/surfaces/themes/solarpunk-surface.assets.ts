import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay, createAccentRings } from '../LayeredSurface';
import { SURFACE_LAYOUT, SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createRadialRingGeometry } from '../surface-geometry';
import { createLeafGeometry, PLAIN_LEAF } from '../leaf-shapes';
import { fillNoise, paintGrain, paintNormalTexture, paintTexture, seededRandom } from '../surface-textures';

const FELT_REPEAT: [number, number] = [3, 3];
const BRASS_LINES = [
  [3.0, 3.012],
  [3.235, 3.247],
] as const;
const BRASS_LEAF = { RADIUS: 3.12, COUNT: 24, SCALE: 0.075, LIFT: 0.0012 } as const;

/** Leaf-vein network: wavy midribs with alternating secondary and tertiary veins (wraps seamlessly). */
function strokeVeins(ctx: CanvasRenderingContext2D, size: number) {
  const rand = seededRandom(57);
  for (let m = 0; m < 4; m++) {
    const y0 = (m + 0.5) * (size / 4) + (rand() - 0.5) * 30;
    const tilt = (rand() - 0.5) * 0.3;
    const yAt = (x: number) => y0 + Math.sin((x / size) * Math.PI * 2 + m) * 12 + x * tilt * 0.1;
    [-size, 0, size].forEach((oy) => {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = -size; x <= size * 2; x += 16) {
        if (x === -size) ctx.moveTo(x, yAt(x) + oy);
        else ctx.lineTo(x, yAt(x) + oy);
      }
      ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let x = 0; x < size; x += 26) {
        const side = (x / 26) % 2 === 0 ? 1 : -1;
        const sx = x;
        const sy = yAt(x) + oy;
        const ex = sx + 34;
        const ey = sy + side * 40;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 20, sy + side * 12, ex, ey);
        ctx.moveTo(sx + 18, sy + side * 16);
        ctx.lineTo(sx + 30, sy + side * 12);
        ctx.stroke();
      }
    });
  }
}

function paintFelt() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      fillNoise(ctx, seededRandom(15), 222, 26);
      ctx.strokeStyle = 'rgba(255,255,220,0.32)';
      strokeVeins(ctx, w);
    },
    { repeat: FELT_REPEAT },
  );
}

function paintFeltNormal() {
  return paintNormalTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w) => {
      ctx.strokeStyle = '#b8b8b8';
      strokeVeins(ctx, w);
    },
    2,
    { repeat: FELT_REPEAT },
  );
}

/** Pale birch with horizontal dark lenticels and the odd dark "eye". */
function paintBirch(palette: TableThemePalette) {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = '#ebe2cf';
      ctx.fillRect(0, 0, w, h);
      const rand = seededRandom(39);
      paintGrain(ctx, rand, palette.wood.molding, 24);
      ctx.fillStyle = 'rgba(58,50,40,0.7)';
      for (let i = 0; i < 110; i++) ctx.fillRect(rand() * w, rand() * h, 6 + rand() * 16, 1.2 + rand() * 2);
      ctx.strokeStyle = 'rgba(40,34,28,0.75)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) {
        const x = rand() * w;
        const y = 20 + rand() * (h - 40);
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 6);
        ctx.quadraticCurveTo(x, y + 6, x + 14, y - 6);
        ctx.stroke();
      }
    },
    { repeat: [8, 1] },
  );
}

/** Brass leaves inlaid around the rim, pointing along it. */
function brassLeafMatrices(): THREE.Matrix4[] {
  const object = new THREE.Object3D();
  return Array.from({ length: BRASS_LEAF.COUNT }, (_, i) => {
    const angle = ((i + 0.5) / BRASS_LEAF.COUNT) * Math.PI * 2;
    object.position.set(
      Math.cos(angle) * BRASS_LEAF.RADIUS,
      SURFACE_LAYOUT.RIM_OVERLAY_Y + BRASS_LEAF.LIFT,
      Math.sin(angle) * BRASS_LEAF.RADIUS,
    );
    object.rotation.set(0, -angle, 0);
    object.scale.set(BRASS_LEAF.SCALE, 0.01, BRASS_LEAF.SCALE);
    object.updateMatrix();
    return object.matrix.clone();
  });
}

export const SOLARPUNK_BRASS_LEAVES = brassLeafMatrices();

/** Moss-green leaf-vein felt, light birch rim with brass inlay for the Verdant Atrium. */
export function createSolarpunkAssets(palette: TableThemePalette) {
  const feltMap = paintFelt();
  const feltNormal = paintFeltNormal();
  const birchMap = paintBirch(palette);
  const base = new THREE.MeshStandardMaterial({
    map: feltMap,
    normalMap: feltNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    color: palette.felt.base,
    roughness: 0.95,
  });
  const edge = base.clone();
  edge.color.set(palette.felt.edge);
  const center = base.clone();
  center.color.set(palette.felt.center);
  const brass = asOverlay(new THREE.MeshStandardMaterial({ color: palette.accent.outerRing, metalness: 0.9, roughness: 0.28 }));
  brass.polygonOffsetUnits = -4;
  return {
    feltMap,
    feltNormal,
    birchMap,
    base,
    edge,
    center,
    rim: asOverlay(new THREE.MeshPhysicalMaterial({ map: birchMap, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 })),
    cap: new THREE.MeshStandardMaterial({ color: palette.wood.molding, roughness: 0.5 }),
    brass,
    brassLineInner: createRadialRingGeometry(BRASS_LINES[0][0], BRASS_LINES[0][1]),
    brassLineOuter: createRadialRingGeometry(BRASS_LINES[1][0], BRASS_LINES[1][1]),
    brassLeafGeometry: createLeafGeometry(PLAIN_LEAF, 0),
    ...createAccentRings(palette),
  };
}
