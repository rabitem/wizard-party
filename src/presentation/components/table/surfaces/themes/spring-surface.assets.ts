import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { createAccentRings } from '../LayeredSurface';
import { SURFACE_LAYOUT, SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createBlossomGeometry, createLeafGeometry, PLAIN_LEAF } from '../leaf-shapes';
import { blotch, paintNormalTexture, paintTexture, seededRandom } from '../surface-textures';

const MOSS_REPEAT: [number, number] = [3, 3];
const MOSS_TONES = ['#5d9a4a', '#2f5a2a', '#7ab35a', '#3f7a3a', '#4f8a3e'];
const SPECK_COLORS = ['#ffffff', '#f7b6cf', '#ffe066', '#c9b6ff', '#ffd1e3'];
export const VINE_BLOSSOM_COLORS = ['#f7b6cf', '#ffffff', '#f29ac0', '#fff1a8'];
const BLOSSOM_CENTER = '#ffd23f';

/** Same clump layout for the colour and height maps. */
function forEachClump(size: number, draw: (x: number, y: number, r: number, i: number) => void) {
  const rand = seededRandom(19);
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 12 + rand() * 38;
    [-size, 0, size].forEach((ox) => [-size, 0, size].forEach((oy) => draw(x + ox, y + oy, r, i)));
  }
}

function paintMoss(palette: TableThemePalette) {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      ctx.fillStyle = palette.felt.base;
      ctx.fillRect(0, 0, w, h);
      forEachClump(w, (x, y, r, i) => blotch(ctx, [x, y], r, MOSS_TONES[i % MOSS_TONES.length], 0.55));
      const rand = seededRandom(8);
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(20,50,15,0.35)' : 'rgba(150,200,110,0.3)';
        ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
      }
      for (let i = 0; i < 80; i++) {
        const x = rand() * w;
        const y = rand() * h;
        ctx.fillStyle = SPECK_COLORS[i % SPECK_COLORS.length];
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = BLOSSOM_CENTER;
        ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      }
    },
    { repeat: MOSS_REPEAT },
  );
}

function paintMossNormal() {
  return paintNormalTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w) => forEachClump(w, (x, y, r) => blotch(ctx, [x, y], r, '#d0d0d0', 0.5)),
    3,
    { repeat: MOSS_REPEAT },
  );
}

const VINE = { WRAPS: 40, OFFSET: 0.034, TUBE: 0.0065, SEGMENTS: 640 } as const;

/** Helix that winds around the inner rim molding. */
class RimVineCurve extends THREE.Curve<THREE.Vector3> {
  // Public constructor (THREE.Curve's is protected)
  constructor() {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const { radius, y } = SURFACE_LAYOUT.LIP_CAP;
    const angle = t * Math.PI * 2;
    const twist = angle * VINE.WRAPS;
    const r = radius + 0.015 + VINE.OFFSET * Math.cos(twist);
    return target.set(Math.cos(angle) * r, y + VINE.OFFSET * Math.sin(twist), Math.sin(angle) * r);
  }
}

const vineCurve = new RimVineCurve();

/** Matrix that lays a flat (XZ) sprig on the vine surface at curve position t. */
function sprigMatrix(t: number, scale: number, lift: number, spin: number): THREE.Matrix4 {
  const point = vineCurve.getPoint(t);
  const angle = t * Math.PI * 2;
  const { radius, y } = SURFACE_LAYOUT.LIP_CAP;
  const core = new THREE.Vector3(Math.cos(angle) * (radius + 0.015), y, Math.sin(angle) * (radius + 0.015));
  const up = point.clone().sub(core).normalize();
  const tangent = vineCurve.getTangent(t).projectOnPlane(up).normalize().applyAxisAngle(up, spin);
  const side = new THREE.Vector3().crossVectors(up, tangent);
  const matrix = new THREE.Matrix4().makeBasis(side, up, tangent).scale(new THREE.Vector3(scale, scale, scale));
  return matrix.setPosition(point.addScaledVector(up, lift));
}

/** Leaf and blossom transforms along the vine (blossom centres share the blossom mesh). */
function vineLayout() {
  const rand = seededRandom(53);
  const leaves: THREE.Matrix4[] = [];
  const leafColors: string[] = [];
  for (let i = 0; i < 120; i++) {
    const t = (i + rand() * 0.6) / 120;
    leaves.push(sprigMatrix(t, 0.04 + rand() * 0.02, 0.004, (rand() - 0.5) * 2.4));
    leafColors.push(rand() < 0.5 ? '#5aa04a' : '#79b85a');
  }
  const blossoms: THREE.Matrix4[] = [];
  const blossomColors: string[] = [];
  for (let i = 0; i < 44; i++) {
    const t = (i + rand()) / 44;
    const spin = rand() * Math.PI;
    const scale = 0.018 + rand() * 0.01;
    blossoms.push(sprigMatrix(t, scale, 0.008, spin));
    blossomColors.push(VINE_BLOSSOM_COLORS[i % VINE_BLOSSOM_COLORS.length]);
    blossoms.push(sprigMatrix(t, scale * 0.35, 0.0095, spin));
    blossomColors.push(BLOSSOM_CENTER);
  }
  return { leaves, leafColors, blossoms, blossomColors };
}

export const SPRING_VINE_LAYOUT = vineLayout();

/** Meadow-moss felt with flower specks and a flowering vine around the rim for the Blossom Garden. */
export function createSpringAssets(palette: TableThemePalette) {
  const mossMap = paintMoss(palette);
  const mossNormal = paintMossNormal();
  const base = new THREE.MeshStandardMaterial({
    map: mossMap,
    normalMap: mossNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.96,
  });
  const edge = base.clone();
  edge.color.set('#b8ccb4');
  const center = base.clone();
  center.color.set('#d6e6d0');
  return {
    mossMap,
    mossNormal,
    base,
    edge,
    center,
    vineGeometry: new THREE.TubeGeometry(vineCurve, VINE.SEGMENTS, VINE.TUBE, 5, true),
    vine: new THREE.MeshStandardMaterial({ color: '#3e6b2c', roughness: 0.8 }),
    leafGeometry: createLeafGeometry(PLAIN_LEAF, 0.2),
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }),
    blossomGeometry: createBlossomGeometry(5),
    blossom: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide }),
    ...createAccentRings(palette),
  };
}
