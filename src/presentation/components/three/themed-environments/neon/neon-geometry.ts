import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { NeonSignShape } from '@/presentation/config/neon-environment.config';

type Point2 = readonly [number, number];
type Polyline = { points: Point2[]; closed: boolean };

const SEGMENTS_PER_UNIT = 14;
const RADIAL_SEGMENTS = 6;
const ARC_STEPS = 18;
const DEG = Math.PI / 180;

interface ArcSpec {
  cx: number;
  cy: number;
  r: number;
  fromDeg: number;
  toDeg: number;
  steps?: number;
}

function arc({ cx, cy, r, fromDeg, toDeg, steps = ARC_STEPS }: ArcSpec): Point2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (fromDeg + ((toDeg - fromDeg) * i) / steps) * DEG;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  });
}

function starPoints(outer: number, inner: number, points = 5): Point2[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points + Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
}

/** Crescent: outer arc through the left, inner arc back between the same tips. */
function moon(): Polyline[] {
  const innerCx = 0.55;
  const tip = [Math.cos(60 * DEG), Math.sin(60 * DEG)] as const;
  const innerR = Math.hypot(tip[0] - innerCx, tip[1]);
  const tipAngle = Math.atan2(tip[1], tip[0] - innerCx) / DEG;
  const outer = arc({ cx: 0, cy: 0, r: 1, fromDeg: 60, toDeg: 300, steps: 26 });
  const inner = arc({ cx: innerCx, cy: 0, r: innerR, fromDeg: 360 - tipAngle, toDeg: tipAngle, steps: 20 }).slice(1, -1);
  return [
    { points: [...outer, ...inner], closed: true },
    { points: starPoints(0.22, 0.09, 4).map(([x, y]) => [x + 0.75, y + 0.05] as const), closed: true },
  ];
}

function bolt(): Polyline[] {
  return [{ points: [[0.3, 1], [-0.42, 0.06], [0.04, 0.06], [-0.3, -1], [0.46, 0.16], [0, 0.16]], closed: true }];
}

function hat(): Polyline[] {
  const cone: Point2[] = [[-0.62, -0.72]];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    cone.push([-0.62 + 0.9 * t + Math.sin(t * Math.PI) * 0.12, -0.72 + 1.72 * t]);
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    cone.push([0.28 + 0.34 * t + Math.sin(t * Math.PI) * 0.1, 1 - 1.72 * t]);
  }
  return [
    { points: [[-1, -0.82], [1, -0.82]], closed: false },
    { points: cone, closed: false },
    { points: [[-0.48, -0.42], [0.55, -0.42]], closed: false },
  ];
}

function diamond(): Polyline[] {
  const outline = (s: number): Point2[] => [[0, s], [0.7 * s, 0], [0, -s], [-0.7 * s, 0]];
  return [
    { points: outline(1), closed: true },
    { points: outline(0.52), closed: true },
  ];
}

function star(): Polyline[] {
  return [{ points: starPoints(1, 0.44), closed: true }];
}

const SHAPES: Record<NeonSignShape, () => Polyline[]> = { moon, bolt, hat, diamond, star };

function polylineTube({ points, closed }: Polyline, radius: number): THREE.BufferGeometry {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const all = closed ? [...points, points[0]] : points;
  for (let i = 1; i < all.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(all[i - 1][0], all[i - 1][1], 0), new THREE.Vector3(all[i][0], all[i][1], 0)));
  }
  const segments = Math.max(8, Math.ceil(path.getLength() * SEGMENTS_PER_UNIT));
  return new THREE.TubeGeometry(path, segments, radius, RADIAL_SEGMENTS, false);
}

/**
 * Neon tube outline for a sign shape in unit space (about 2 x 2, centred).
 * The radius is in unit space: callers divide by the sign scale so every
 * sign ends up with the same tube thickness.
 */
export function createNeonSignGeometry(shape: NeonSignShape, radius: number): THREE.BufferGeometry {
  const tubes = SHAPES[shape]().map((line) => polylineTube(line, radius));
  const merged = mergeGeometries(tubes) ?? new THREE.BufferGeometry();
  tubes.forEach((tube) => tube.dispose());
  return merged;
}
