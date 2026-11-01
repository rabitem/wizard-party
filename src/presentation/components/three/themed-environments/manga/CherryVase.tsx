'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MANGA_BLOSSOM_COLORS, MANGA_COLORS, MANGA_TOKONOMA } from '@/presentation/config/manga-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, localMatrix, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { MatrixInstances } from '../primitives/MatrixInstances';
import { createInkOutlineMaterial, createToonMaterial, createVaseGeometry, segmentMatrix } from './manga-geometry';

const VASE_SCALE = 0.95;
const VASE_MOUTH_Y = 0.95 * VASE_SCALE;
const BRANCH = { SEGMENT: 0.32, RADIUS: 0.045, TAPER: 0.8 } as const;
const BLOSSOM = { MIN: 0.07, MAX: 0.12, SPREAD: 0.12 } as const;
const OUTLINE = localMatrix([0, 0, 0], [0, 0, 0], [1.08, 1.03, 1.08]);

interface BranchLayout {
  segments: THREE.Matrix4[];
  tips: THREE.Vector3[];
}

/** Grows a bending branch, recording segment matrices and points for blossoms. */
interface Shoot {
  start: THREE.Vector3;
  direction: THREE.Vector3;
  steps: number;
  radius: number;
}

function grow(layout: BranchLayout, { start, direction, steps, radius }: Shoot, rand: () => number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [start.clone()];
  let current = start.clone();
  let r = radius;
  for (let i = 0; i < steps; i++) {
    direction.add(new THREE.Vector3((rand() - 0.5) * 0.5, (rand() - 0.3) * 0.25, (rand() - 0.5) * 0.3)).normalize();
    const next = current.clone().addScaledVector(direction, BRANCH.SEGMENT * (0.8 + rand() * 0.4));
    layout.segments.push(segmentMatrix(current, next, r / BRANCH.RADIUS));
    points.push(next.clone());
    current = next;
    r *= BRANCH.TAPER;
  }
  layout.tips.push(...points.slice(Math.ceil(points.length * 0.4)));
  return points;
}

/** Main stem arcing out of the vase with three side branches. */
function buildBranch(): BranchLayout {
  const rand = seededRandom(MANGA_TOKONOMA.BRANCH_SEED);
  const layout: BranchLayout = { segments: [], tips: [] };
  const base = new THREE.Vector3(0, VASE_MOUTH_Y, 0);
  const main = grow(layout, { start: base, direction: new THREE.Vector3(-0.35, 1, 0.15).normalize(), steps: 7, radius: BRANCH.RADIUS }, rand);
  const forks: Array<[number, Vec3, number]> = [
    [2, [0.9, 0.7, 0.2], 4],
    [3, [-1, 0.4, 0.3], 4],
    [5, [0.6, 0.8, -0.2], 3],
  ];
  forks.forEach(([index, dir, steps]) => {
    grow(layout, { start: main[index], direction: new THREE.Vector3(...dir).normalize(), steps, radius: BRANCH.RADIUS * 0.6 }, rand);
  });
  return layout;
}

function scatterBlossoms(tips: readonly THREE.Vector3[]): PropPlacement[] {
  const rand = seededRandom(MANGA_TOKONOMA.BRANCH_SEED + 1);
  return Array.from({ length: MANGA_TOKONOMA.BLOSSOMS }, (_, i) => {
    const tip = tips[i % tips.length];
    return {
      position: [
        tip.x + (rand() - 0.5) * BLOSSOM.SPREAD * 2,
        tip.y + (rand() - 0.5) * BLOSSOM.SPREAD * 1.4,
        tip.z + (rand() - 0.5) * BLOSSOM.SPREAD * 2,
      ] as Vec3,
      scale: BLOSSOM.MIN + rand() * (BLOSSOM.MAX - BLOSSOM.MIN),
      rotationY: rand() * Math.PI,
      color: MANGA_BLOSSOM_COLORS[i % MANGA_BLOSSOM_COLORS.length],
    };
  });
}

const VASE_PLACEMENT: PropPlacement[] = [{ position: [0, 0, 0], scale: VASE_SCALE }];

/** Ikebana: a white porcelain vase holding a flowering cherry branch on the tokonoma. */
export function CherryVase() {
  const branch = useMemo(() => buildBranch(), []);
  const blossoms = useMemo(() => scatterBlossoms(branch.tips), [branch]);
  const assets = useMemo(
    () => ({
      vase: createVaseGeometry(),
      stem: new THREE.CylinderGeometry(BRANCH.RADIUS * BRANCH.TAPER, BRANCH.RADIUS, 1, 6),
      blossom: new THREE.IcosahedronGeometry(1, 0),
      porcelain: createToonMaterial(MANGA_COLORS.vase),
      bark: createToonMaterial(MANGA_COLORS.branch),
      bloom: createToonMaterial('#ffffff', { emissive: '#3a1a24', emissiveIntensity: 0.45 }),
      outline: createInkOutlineMaterial(),
    }),
    [],
  );
  useDisposables(assets);

  const [x, y, z] = MANGA_TOKONOMA.POSITION;
  return (
    <group position={[x, y + MANGA_TOKONOMA.SIZE[1], z]}>
      <InstancedProp geometry={assets.vase} material={assets.porcelain} placements={VASE_PLACEMENT} />
      <InstancedProp geometry={assets.vase} material={assets.outline} placements={VASE_PLACEMENT} offset={OUTLINE} />
      <MatrixInstances geometry={assets.stem} material={assets.bark} matrices={branch.segments} />
      <InstancedProp geometry={assets.blossom} material={assets.bloom} placements={blossoms} />
    </group>
  );
}
