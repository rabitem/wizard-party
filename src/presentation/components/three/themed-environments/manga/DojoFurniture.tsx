'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  MANGA_COLORS,
  MANGA_CUSHION_COLORS,
  MANGA_KATANA_RACK,
  MANGA_LOW_TABLES,
  MANGA_ROOM,
} from '@/presentation/config/manga-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, localMatrix, placementMatrix, useDisposables, type PropPlacement } from '../primitives';
import { MatrixInstances } from '../primitives/MatrixInstances';
import { createInkOutlineMaterial, createToonMaterial, outlineScale } from './manga-geometry';

const TABLE = { TOP: [1.7, 0.08, 1.0] as Vec3, HEIGHT: 0.36, LEG: 0.08, LEG_INSET: [0.75, 0.42] as [number, number] } as const;
const CUSHION = { SIZE: [0.78, 0.1, 0.78] as Vec3, OFFSET_Z: 0.98 } as const;
const CUP = { RADIUS: 0.05, HEIGHT: 0.09, SPOTS: [[-0.35, 0.18], [0.3, -0.2]] as ReadonlyArray<[number, number]> } as const;
const OUTLINE_THICKNESS = 0.025;

const TABLE_PLACEMENTS: PropPlacement[] = MANGA_LOW_TABLES.map(([x, z, rotationY]) => ({ position: [x, MANGA_ROOM.FLOOR_Y, z], rotationY }));
const TOP_OFFSET = localMatrix([0, TABLE.HEIGHT - TABLE.TOP[1] / 2, 0], [0, 0, 0], TABLE.TOP);
const TOP_OUTLINE = localMatrix(
  [0, TABLE.HEIGHT - TABLE.TOP[1] / 2, 0],
  [0, 0, 0],
  TABLE.TOP.map((v, i) => v * outlineScale(TABLE.TOP, OUTLINE_THICKNESS)[i]) as Vec3,
);

/** World matrices for each table placement composed with local offsets. */
function composeAll(locals: readonly THREE.Matrix4[]): THREE.Matrix4[] {
  return TABLE_PLACEMENTS.flatMap((placement) => {
    const base = placementMatrix(placement);
    return locals.map((local) => base.clone().multiply(local));
  });
}

const LEG_HEIGHT = TABLE.HEIGHT - TABLE.TOP[1];
const LEG_LOCALS = [-1, 1].flatMap((sx) =>
  [-1, 1].map((sz) =>
    localMatrix([sx * TABLE.LEG_INSET[0], LEG_HEIGHT / 2, sz * TABLE.LEG_INSET[1]], [0, 0, 0], [TABLE.LEG, LEG_HEIGHT, TABLE.LEG]),
  ),
);
const CUSHION_LOCALS = [-1, 1].map((side) => localMatrix([0, CUSHION.SIZE[1] / 2, side * CUSHION.OFFSET_Z], [0, 0, 0], CUSHION.SIZE));
const CUP_LOCALS = CUP.SPOTS.map(([x, z]) => localMatrix([x, TABLE.HEIGHT + CUP.HEIGHT / 2, z]));

/** Katana rack (local units, scaled by MANGA_KATANA_RACK.SCALE). */
const RACK_FRAME: PropPlacement[] = [
  { position: [0, 0.03, 0], scale: [0.95, 0.06, 0.32] },
  { position: [-0.36, 0.42, 0], scale: [0.07, 0.8, 0.12] },
  { position: [0.36, 0.42, 0], scale: [0.07, 0.8, 0.12] },
  ...MANGA_KATANA_RACK.TIERS.flatMap((y) => [
    { position: [-0.36, y, 0.08] as Vec3, scale: [0.09, 0.03, 0.16] as Vec3 },
    { position: [0.36, y, 0.08] as Vec3, scale: [0.09, 0.03, 0.16] as Vec3 },
  ]),
];
const SWORDS: PropPlacement[] = MANGA_KATANA_RACK.TIERS.map((y) => ({ position: [0, y + 0.032, 0.11] }));
const SAYA = localMatrix([-0.08, 0, 0], [0, 0, 0], [0.84, 0.034, 0.028]);
const TSUKA = localMatrix([0.46, 0, 0], [0, 0, 0], [0.26, 0.032, 0.03]);
const TSUBA = localMatrix([0.33, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1]);

/** Low zataku tables with zabuton cushions and tea cups, plus a katana rack. */
export function DojoFurniture() {
  const matrices = useMemo(
    () => ({ legs: composeAll(LEG_LOCALS), cushions: composeAll(CUSHION_LOCALS), cups: composeAll(CUP_LOCALS) }),
    [],
  );
  const assets = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      cup: new THREE.CylinderGeometry(CUP.RADIUS, CUP.RADIUS * 0.8, CUP.HEIGHT, 10),
      tsuba: new THREE.CylinderGeometry(0.045, 0.045, 0.012, 10),
      wood: createToonMaterial(MANGA_COLORS.woodDark),
      woodLight: createToonMaterial(MANGA_COLORS.woodLight),
      cushion: createToonMaterial('#ffffff'),
      porcelain: createToonMaterial(MANGA_COLORS.vase),
      lacquer: createToonMaterial(MANGA_COLORS.lacquer),
      wrap: createToonMaterial(MANGA_COLORS.wrap),
      gold: createToonMaterial(MANGA_COLORS.gold),
      outline: createInkOutlineMaterial(),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.wood} placements={TABLE_PLACEMENTS} offset={TOP_OFFSET} />
      <InstancedProp geometry={assets.box} material={assets.outline} placements={TABLE_PLACEMENTS} offset={TOP_OUTLINE} />
      <MatrixInstances geometry={assets.box} material={assets.wood} matrices={matrices.legs} />
      <MatrixInstances geometry={assets.box} material={assets.cushion} matrices={matrices.cushions} colors={MANGA_CUSHION_COLORS} />
      <MatrixInstances geometry={assets.cup} material={assets.porcelain} matrices={matrices.cups} />

      <group position={MANGA_KATANA_RACK.POSITION} rotation={[0, MANGA_KATANA_RACK.ROTATION_Y, 0]} scale={MANGA_KATANA_RACK.SCALE}>
        <InstancedProp geometry={assets.box} material={assets.woodLight} placements={RACK_FRAME} />
        <InstancedProp geometry={assets.box} material={assets.lacquer} placements={SWORDS} offset={SAYA} />
        <InstancedProp geometry={assets.box} material={assets.wrap} placements={SWORDS} offset={TSUKA} />
        <InstancedProp geometry={assets.tsuba} material={assets.gold} placements={SWORDS} offset={TSUBA} />
      </group>
    </group>
  );
}
