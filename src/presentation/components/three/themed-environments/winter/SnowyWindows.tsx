'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  WINTER_COLORS,
  WINTER_LAYOUT,
  WINTER_SILL_CANDLES,
  type WinterWindow,
} from '@/presentation/config/winter-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  CandleCluster,
  createPbrMaterial,
  InstancedProp,
  seededRandom,
  useDisposables,
  WindowSnowView,
  type CandlePlacement,
  type PropPlacement,
} from '../primitives';
import { applySnowDusting } from './snow-dusting';
import { createIcicleGeometry } from './winter-geometry';
import { createSnowRollGeometry } from './lodge-shell-geometry';

const FRAME = 0.14;
const SILL = { HEIGHT: 0.14, DEPTH: 0.42, OVERHANG: 0.3, SNOW: 0.07 } as const;
/** Snow ridge left on the cross mullion and the bottom rail inside the frame */
const LEDGE_SNOW = 0.035;
/** Pane sits just in front of the wall so it never z-fights with it */
const PANE_OFFSET = 0.01;

const { WINDOWS } = WINTER_LAYOUT;

function sillTop(win: WinterWindow): number {
  return win.center[1] - win.size[1] / 2 - FRAME / 2 + SILL.HEIGHT / 2 + SILL.SNOW;
}

/** Window frame bars (outer frame plus a cross mullion) for one window. */
function frameBars(win: WinterWindow): PropPlacement[] {
  const [x, y, z] = win.center;
  const [w, h] = win.size;
  return [
    { position: [x, y + h / 2, z + 0.06], scale: [w + FRAME * 2, FRAME, 0.12] },
    { position: [x, y - h / 2, z + 0.06], scale: [w + FRAME * 2, FRAME, 0.12] },
    { position: [x - w / 2, y, z + 0.06], scale: [FRAME, h, 0.12] },
    { position: [x + w / 2, y, z + 0.06], scale: [FRAME, h, 0.12] },
    { position: [x, y, z + 0.05], scale: [FRAME * 0.55, h, 0.08] },
    { position: [x, y + h * 0.12, z + 0.05], scale: [w, FRAME * 0.55, 0.08] },
  ];
}

const FRAMES: PropPlacement[] = WINDOWS.flatMap(frameBars);
const SILLS: PropPlacement[] = WINDOWS.map((win) => ({
  position: [win.center[0], win.center[1] - win.size[1] / 2 - FRAME / 2, win.center[2] + SILL.DEPTH / 2],
  scale: [win.size[0] + SILL.OVERHANG, SILL.HEIGHT, SILL.DEPTH],
}));
/** Rounded drifts heaped on the sills, a little uneven per window. */
const SILL_DRIFTS: PropPlacement[] = SILLS.flatMap((sill, i) => {
  const [sx, sy, sz] = sill.scale as Vec3;
  const top = sill.position[1] + sy / 2;
  return [
    { position: [sill.position[0], top, sill.position[2] - sz * 0.12], scale: [sx * 0.97, SILL.SNOW * 1.6, sz * 0.36] },
    { position: [sill.position[0] + (i % 2 === 0 ? 0.15 : 0.08), top, sill.position[2] - sz * 0.2], scale: [sx * 0.25, SILL.SNOW * 2.4, sz * 0.3] },
  ] as PropPlacement[];
});
/** Thin snow ridges caught on the cross mullion and the lower frame rail. */
const LEDGE_DRIFTS: PropPlacement[] = WINDOWS.flatMap((win) => {
  const [x, y, z] = win.center;
  const [w, h] = win.size;
  return [
    { position: [x, y + h * 0.12 + FRAME * 0.27, z + 0.05], scale: [w * 0.94, LEDGE_SNOW, 0.04] },
    { position: [x, y - h / 2 + FRAME / 2, z + 0.06], scale: [w * 0.96, LEDGE_SNOW * 1.8, 0.06] },
  ] as PropPlacement[];
});
const ICICLES: PropPlacement[] = WINDOWS.flatMap((win, w) => {
  const rand = seededRandom(31 + w);
  const count = WINTER_LAYOUT.ICICLES_PER_WINDOW;
  const top = win.center[1] + win.size[1] / 2 - FRAME / 2;
  return Array.from({ length: count }, (_, i) => ({
    position: [win.center[0] + ((i + 0.5) / count - 0.5) * win.size[0], top, win.center[2] + 0.13] as Vec3,
    scale: [1, 0.5 + rand() * 0.9, 1] as Vec3,
  }));
});
const SILL_CANDLES: CandlePlacement[] = WINDOWS.flatMap((win) =>
  WINTER_SILL_CANDLES.map(([dx, height]) => ({
    position: [win.center[0] + dx * win.size[0] * 0.5, sillTop(win), win.center[2] + SILL.DEPTH * 0.55] as Vec3,
    height,
    scale: 1.1,
  })),
);

/**
 * Back-wall windows onto a moonlit snowy forest: ray-cast panes with
 * parallax snow layers and frosted edges, snow-dusted timber frames, snow
 * heaped on the sills and mullions, icicles and sill candles.
 */
export function SnowyWindows() {
  const assets = useMemo(
    () => ({
      frame: applySnowDusting(
        addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.windowFrame, roughness: 0.8 }), { scale: 2, normalStrength: 0.4 }),
        { amount: 0.45, threshold: 0.7, sparkle: 0.3 },
      ),
      snow: createPbrMaterial('snow', { color: WINTER_COLORS.snow, accent: WINTER_COLORS.snowShadow, repeat: [2, 1] }),
      ice: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.ice, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }),
      box: new THREE.BoxGeometry(1, 1, 1),
      roll: createSnowRollGeometry(),
      icicle: createIcicleGeometry(),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      {WINDOWS.map((win) => (
        <WindowSnowView
          key={`pane-${win.center[0]}`}
          position={[win.center[0], win.center[1], win.center[2] + PANE_OFFSET]}
          size={win.size}
          variant="night"
          precipitation="snow"
          frost={WINTER_LAYOUT.WINDOW_FROST}
        />
      ))}
      <InstancedProp geometry={assets.box} material={assets.frame} placements={FRAMES} />
      <InstancedProp geometry={assets.box} material={assets.frame} placements={SILLS} />
      <InstancedProp geometry={assets.roll} material={assets.snow} placements={SILL_DRIFTS} />
      <InstancedProp geometry={assets.roll} material={assets.snow} placements={LEDGE_DRIFTS} />
      <InstancedProp geometry={assets.icicle} material={assets.ice} placements={ICICLES} />
      <CandleCluster candles={SILL_CANDLES} waxColor={WINTER_COLORS.wax} flameColor={WINTER_COLORS.candleFlame} glowColor={WINTER_COLORS.candleGlow} />
    </group>
  );
}
