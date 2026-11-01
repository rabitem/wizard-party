'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WINTER_COLORS } from '@/presentation/config/winter-environment.config';
import { PORCH_FRONT_Z, WINTER_ARCHWAY, WINTER_PORCH, WINTER_YARD_COLORS } from '@/presentation/config/winter-porch.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, createPbrMaterial, InstancedProp, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { applySnowDusting } from './snow-dusting';
import { createIcicleGeometry } from './winter-geometry';
import { createSnowRollGeometry } from './lodge-shell-geometry';

const { FLOOR_Y, HALF_DEPTH } = ENVIRONMENT_ROOM;
const BACK_Z = -HALF_DEPTH;
const P = WINTER_PORCH;
const A = WINTER_ARCHWAY;
const DECK_CENTER_Z = BACK_Z - P.DEPTH / 2;
const ROOF_DEPTH = P.DEPTH + P.ROOF_OVERHANG;
const ROOF_CENTER_Z = BACK_Z - ROOF_DEPTH / 2 + 0.05;
const ROOF_FRONT_Z = BACK_Z - ROOF_DEPTH + 0.05;
const ROOF_TOP = P.ROOF_Y + P.ROOF_THICKNESS / 2;
const POST_Z = PORCH_FRONT_Z + P.POST;
const POST_X = P.HALF_WIDTH - P.POST;
const POST_HEIGHT = P.ROOF_Y - P.ROOF_THICKNESS / 2 - FLOOR_Y;
const HEADER = 0.36;

/** Archway timber frame on the inside face of the opening: two jambs and a lintel. */
const ARCH_FRAME: PropPlacement[] = [
  ...[-1, 1].map((side) => ({
    position: [side * (A.WIDTH / 2 + A.JAMB_WIDTH / 2 - 0.05), FLOOR_Y + A.HEIGHT / 2, BACK_Z] as Vec3,
    scale: [A.JAMB_WIDTH, A.HEIGHT + A.LINTEL_HEIGHT, A.FRAME_DEPTH] as Vec3,
  })),
  {
    position: [0, FLOOR_Y + A.HEIGHT + A.LINTEL_HEIGHT / 2 - 0.05, BACK_Z],
    scale: [A.WIDTH + A.JAMB_WIDTH * 2.6, A.LINTEL_HEIGHT, A.FRAME_DEPTH + 0.1],
  },
];

/** Porch timbers outside (all collect snow): posts, header beam, rails and balusters. */
const PORCH_TIMBER: PropPlacement[] = (() => {
  const railLength = POST_X - P.RAIL_INNER_X;
  const parts: PropPlacement[] = [
    ...[-1, 1].map((side) => ({ position: [side * POST_X, FLOOR_Y + POST_HEIGHT / 2, POST_Z] as Vec3, scale: [P.POST, POST_HEIGHT, P.POST] as Vec3 })),
    { position: [0, P.ROOF_Y - P.ROOF_THICKNESS / 2 - HEADER / 2, POST_Z], scale: [P.HALF_WIDTH * 2, HEADER, HEADER] },
  ];
  [-1, 1].forEach((side) => {
    const centerX = side * (P.RAIL_INNER_X + railLength / 2);
    parts.push({ position: [centerX, P.RAIL_Y, POST_Z], scale: [railLength, 0.12, 0.14] });
    parts.push({ position: [centerX, FLOOR_Y + 0.12, POST_Z], scale: [railLength, 0.1, 0.12] });
    for (let i = 0; i < P.BALUSTERS_PER_SIDE; i++) {
      const x = side * (P.RAIL_INNER_X + ((i + 0.5) / P.BALUSTERS_PER_SIDE) * railLength);
      parts.push({ position: [x, (FLOOR_Y + P.RAIL_Y) / 2, POST_Z], scale: [0.08, P.RAIL_Y - FLOOR_Y, 0.08] });
    }
  });
  return parts;
})();

/** Snow slab on the roof. */
const SNOW_CAPS: PropPlacement[] = [
  { position: [0, ROOF_TOP, ROOF_CENTER_Z], scale: [P.HALF_WIDTH * 2 + P.ROOF_OVERHANG * 2, P.ROOF_SNOW * 0.6, ROOF_DEPTH * 0.98] },
];
/** Rounded cornice of snow curling over the roof's front edge, and rolls on the rails. */
const CORNICES: PropPlacement[] = [
  { position: [0, ROOF_TOP, ROOF_FRONT_Z + P.CORNICE_RADIUS * 0.6], scale: [P.HALF_WIDTH * 2 + P.ROOF_OVERHANG * 2, P.ROOF_SNOW, P.CORNICE_RADIUS] },
  ...[-1, 1].map((side) => ({
    position: [side * (P.RAIL_INNER_X + (POST_X - P.RAIL_INNER_X) / 2), P.RAIL_Y + 0.06, POST_Z] as Vec3,
    scale: [POST_X - P.RAIL_INNER_X - 0.05, 0.09, 0.085] as Vec3,
  })),
];

const ICICLES: PropPlacement[] = (() => {
  const rand = seededRandom(73);
  const width = P.HALF_WIDTH * 2 + P.ROOF_OVERHANG;
  return Array.from({ length: P.ICICLE_COUNT }, (_, i) => ({
    position: [((i + 0.3 + rand() * 0.4) / P.ICICLE_COUNT - 0.5) * width, P.ROOF_Y - P.ROOF_THICKNESS / 2, ROOF_FRONT_Z + 0.06] as Vec3,
    scale: [0.9 + rand() * 0.5, 0.6 + rand() * 1.6, 0.9 + rand() * 0.5] as Vec3,
  }));
})();

/**
 * The open archway and the covered porch behind it: timber frame, snowy
 * deck, roof slab with a snow cornice and icicles, posts, rails and
 * balusters dusted with snow.
 */
export function SnowyPorch() {
  const assets = useMemo(
    () => ({
      frame: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.beam, roughness: 0.85 }), { scale: 2, normalStrength: 0.55 }),
      deck: applySnowDusting(
        createPbrMaterial('wood', { color: WINTER_YARD_COLORS.porchWood, accent: WINTER_YARD_COLORS.porchGrain, repeat: [3, 2], seed: 61 }),
        { amount: 0.62, threshold: -0.2, patchScale: 1.1, color: WINTER_COLORS.snow },
      ),
      timber: applySnowDusting(
        addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_YARD_COLORS.porchWood, roughness: 0.85 }), { scale: 2, normalStrength: 0.5 }),
        { amount: 0.85, threshold: 0.45, patchScale: 2.2, color: WINTER_COLORS.snow },
      ),
      roof: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_YARD_COLORS.roofUnderside, roughness: 0.9 }), { scale: 3, normalStrength: 0.4 }),
      snow: createPbrMaterial('snow', { color: WINTER_COLORS.snow, accent: WINTER_COLORS.snowShadow, repeat: [3, 1], roughness: 1 }),
      ice: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.ice, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82 }),
      box: new THREE.BoxGeometry(1, 1, 1),
      roll: createSnowRollGeometry(),
      icicle: createIcicleGeometry(),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.frame} placements={ARCH_FRAME} />
      <mesh position={[0, FLOOR_Y - P.DECK_THICKNESS / 2, DECK_CENTER_Z]} material={assets.deck}>
        <boxGeometry args={[P.HALF_WIDTH * 2, P.DECK_THICKNESS, P.DEPTH]} />
      </mesh>
      <mesh position={[0, P.ROOF_Y, ROOF_CENTER_Z]} material={assets.roof}>
        <boxGeometry args={[P.HALF_WIDTH * 2 + P.ROOF_OVERHANG * 2, P.ROOF_THICKNESS, ROOF_DEPTH]} />
      </mesh>
      <InstancedProp geometry={assets.box} material={assets.timber} placements={PORCH_TIMBER} />
      <InstancedProp geometry={assets.box} material={assets.snow} placements={SNOW_CAPS} />
      <InstancedProp geometry={assets.roll} material={assets.snow} placements={CORNICES} />
      <InstancedProp geometry={assets.icicle} material={assets.ice} placements={ICICLES} />
    </group>
  );
}
