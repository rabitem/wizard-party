'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MANGA_COLORS, MANGA_RIM } from '@/presentation/config/manga-environment.config';
import { InstancedProp, localMatrix, useDisposables, type PropPlacement } from '../primitives';
import { createToonMaterial, createCraneGeometry } from './manga-geometry';

/**
 * Small props on the wood rim, in the safe slots outside the play area and
 * visual only (no colliders): an ink stone with a brush, two tea cups, a
 * rolled scroll tied with red cord and a red paper crane.
 */

const INK_STONE = { SIZE: [0.22, 0.03, 0.13] as [number, number, number], WELL: 0.035 } as const;
const BRUSH = { LENGTH: 0.22, RADIUS: 0.009, TIP: 0.035 } as const;
const CUP = { RADIUS: 0.035, HEIGHT: 0.06 } as const;
const SCROLL = { LENGTH: 0.24, RADIUS: 0.028 } as const;
const CRANE_SCALE = 0.17;

const STONE: PropPlacement[] = [MANGA_RIM.INK_STONE];
const BRUSHES: PropPlacement[] = [{ ...MANGA_RIM.BRUSH, tilt: [0, Math.PI / 2] }];
const CUPS: PropPlacement[] = MANGA_RIM.TEA_CUPS.map((cup) => ({ ...cup }));
const SCROLLS: PropPlacement[] = [{ ...MANGA_RIM.SCROLL, tilt: [0, Math.PI / 2] }];
const CRANES: PropPlacement[] = [{ ...MANGA_RIM.CRANE, scale: CRANE_SCALE }];

const STONE_OFFSET = localMatrix([0, INK_STONE.SIZE[1] / 2, 0], [0, 0, 0], INK_STONE.SIZE);
/** Ink pooled in the stone's well (a thin dark disc on top). */
const WELL_OFFSET = localMatrix([INK_STONE.SIZE[0] * 0.25, INK_STONE.SIZE[1] + 0.002, 0]);
/** Brush lies along local y (tilted flat); handle then a tapered tip. */
const HANDLE_OFFSET = localMatrix([0, 0, 0], [0, 0, 0], [1, BRUSH.LENGTH, 1]);
const TIP_OFFSET = localMatrix([0, -(BRUSH.LENGTH + BRUSH.TIP) / 2, 0], [Math.PI, 0, 0]);
const CUP_OFFSET = localMatrix([0, CUP.HEIGHT / 2, 0]);
const TEA_OFFSET = localMatrix([0, CUP.HEIGHT - 0.008, 0]);
const SCROLL_OFFSET = localMatrix([0, 0, 0], [0, 0, 0], [1, SCROLL.LENGTH, 1]);
const TIE_OFFSET = localMatrix([0, SCROLL.LENGTH * 0.15, 0]);

export function MangaTableDecor() {
  const assets = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      disc: new THREE.CylinderGeometry(INK_STONE.WELL, INK_STONE.WELL, 0.004, 12),
      handle: new THREE.CylinderGeometry(BRUSH.RADIUS, BRUSH.RADIUS, 1, 6),
      tip: new THREE.ConeGeometry(BRUSH.RADIUS * 1.8, BRUSH.TIP, 8),
      cup: new THREE.CylinderGeometry(CUP.RADIUS, CUP.RADIUS * 0.75, CUP.HEIGHT, 12),
      tea: new THREE.CylinderGeometry(CUP.RADIUS * 0.85, CUP.RADIUS * 0.85, 0.004, 12),
      scroll: new THREE.CylinderGeometry(SCROLL.RADIUS, SCROLL.RADIUS, 1, 10),
      tie: new THREE.CylinderGeometry(SCROLL.RADIUS * 1.08, SCROLL.RADIUS * 1.08, 0.012, 10),
      crane: createCraneGeometry(),
      stone: createToonMaterial(MANGA_COLORS.inkSoft),
      ink: createToonMaterial(MANGA_COLORS.ink),
      bamboo: createToonMaterial(MANGA_COLORS.woodLight),
      porcelain: createToonMaterial(MANGA_COLORS.vase),
      teaLiquid: createToonMaterial('#6b7a2e'),
      paper: createToonMaterial(MANGA_COLORS.paper),
      red: createToonMaterial(MANGA_COLORS.red, { side: THREE.DoubleSide }),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.stone} placements={STONE} offset={STONE_OFFSET} />
      <InstancedProp geometry={assets.disc} material={assets.ink} placements={STONE} offset={WELL_OFFSET} />
      <InstancedProp geometry={assets.handle} material={assets.bamboo} placements={BRUSHES} offset={HANDLE_OFFSET} />
      <InstancedProp geometry={assets.tip} material={assets.ink} placements={BRUSHES} offset={TIP_OFFSET} />
      <InstancedProp geometry={assets.cup} material={assets.porcelain} placements={CUPS} offset={CUP_OFFSET} />
      <InstancedProp geometry={assets.tea} material={assets.teaLiquid} placements={CUPS} offset={TEA_OFFSET} />
      <InstancedProp geometry={assets.scroll} material={assets.paper} placements={SCROLLS} offset={SCROLL_OFFSET} />
      <InstancedProp geometry={assets.tie} material={assets.red} placements={SCROLLS} offset={TIE_OFFSET} />
      <InstancedProp geometry={assets.crane} material={assets.red} placements={CRANES} />
    </group>
  );
}
